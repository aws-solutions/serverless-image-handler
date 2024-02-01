locals {
  function_name = "image-handler${var.app_suffix}"
  environment   = "production"
  zip_package   = "../dist/image-handler.zip"
  s3_key        = "image-handler/${local.function_name}.zip"
}

module "lambda" {
  source  = "registry.terraform.io/moritzzimmer/lambda/aws"
  version = "7.5.0"

  architectures                    = ["arm64"]
  layers                           = [nonsensitive(data.aws_ssm_parameter.logging_layer.value)]
  cloudwatch_logs_enabled          = false
  description                      = "provider of cute kitty pics."
  function_name                    = local.function_name
  ignore_external_function_updates = true
  memory_size                      = 1536
  publish                          = true
  runtime                          = "nodejs20.x"
  handler                          = "index.handler"
  s3_bucket                        = aws_s3_object.this.bucket
  s3_key                           = aws_s3_object.this.key
  s3_object_version                = aws_s3_object.this.version_id
  timeout                          = 30

  environment = {
    variables = {
      AUTO_WEBP      = "Yes"
      CORS_ENABLED   = "Yes"
      CORS_ORIGIN    = "*"
      SOURCE_BUCKETS = "master-images-${var.account_id}-${var.region}"

      LOG_EXT_OPEN_SEARCH_URL = "https://logs.stroeer.engineering"
    }
  }

  vpc_config = {
    security_group_ids = [data.aws_security_group.vpc_endpoints.id, data.aws_security_group.all_outbound.id, data.aws_security_group.lambda.id]
    subnet_ids         = data.aws_subnets.selected.ids
  }
}

resource "aws_lambda_function_url" "production" {
  authorization_type = "NONE"
  function_name      = aws_lambda_alias.this.function_name
  qualifier          = aws_lambda_alias.this.name
}

resource "aws_lambda_permission" "function_url_allow_public_access" {
  action                 = "lambda:InvokeFunctionUrl"
  function_name          = aws_lambda_alias.this.function_name
  qualifier              = aws_lambda_alias.this.name
  principal              = "*"
  function_url_auth_type = "NONE"
  statement_id           = "FunctionURLAllowPublicAccess"
}

# ---------------------------------------------------------------------------------------------------------------------
# Deployment resources
# ---------------------------------------------------------------------------------------------------------------------

// this resource is only used for the initial `terraform apply` all further
// deployments are running on CodePipeline
resource "aws_s3_object" "this" {
  bucket = data.aws_s3_bucket.ci.bucket
  key    = local.s3_key
  source = fileexists(local.zip_package) ? local.zip_package : null
  etag   = fileexists(local.zip_package) ? filemd5(local.zip_package) : null

  #  lifecycle {
  #    ignore_changes = [etag, source, version_id, tags_all]
  #  }
}

resource "aws_lambda_alias" "this" {
  description      = "Alias for the active Lambda version"
  function_name    = module.lambda.function_name
  function_version = module.lambda.version
  name             = local.environment

  lifecycle {
    ignore_changes = [function_version]
  }
}

module "deployment" {
  source  = "registry.terraform.io/moritzzimmer/lambda/aws//modules/deployment"
  version = "7.5.0"

  alias_name                                  = aws_lambda_alias.this.name
  codebuild_cloudwatch_logs_retention_in_days = 7
  codestar_notifications_target_arn           = data.aws_sns_topic.notifications.arn
  codepipeline_artifact_store_bucket          = data.aws_s3_bucket.pipeline_artifacts.bucket
  codepipeline_type                           = "V2"
  s3_bucket                                   = data.aws_s3_bucket.ci.bucket
  s3_key                                      = local.s3_key
  function_name                               = local.function_name
}

resource "opensearch_role" "logs_write_access" {
  role_name           = local.function_name
  description         = "Write access for ${local.function_name} lambda"
  cluster_permissions = ["indices:data/write/bulk"]

  index_permissions {
    index_patterns  = ["${local.function_name}-lambda-*"]
    allowed_actions = ["write", "create_index"]
  }
}

resource "opensearch_roles_mapping" "logs_write_access" {
  role_name     = opensearch_role.logs_write_access.role_name
  backend_roles = [module.lambda.role_arn]
}
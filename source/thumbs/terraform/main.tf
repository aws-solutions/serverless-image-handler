locals {
  function_name = "image-thumbs${var.app_suffix}"
  environment   = "production"
  zip_package   = "../target/lambda/arm64/thumbs/bootstrap.zip"
  s3_key        = "image-thumbs/${local.function_name}.zip"
}

module "lambda" {
  source  = "registry.terraform.io/moritzzimmer/lambda/aws"
  version = "7.0.0"

  architectures = ["arm64"]
  layers = [
    "arn:aws:lambda:${var.region}:${var.account_id}:layer:CustomLoggingExtensionOpenSearch-Arm64:10"
  ]
  cloudwatch_logs_enabled          = false
  description                      = "provider of cute kitty thumbs."
  function_name                    = local.function_name
  ignore_external_function_updates = true
  memory_size                      = 1024
  publish                          = true
  runtime                          = "provided.al2"
  handler                          = "thumbs"
  s3_bucket                        = data.aws_s3_bucket.ci.bucket
  s3_key                           = local.s3_key
  s3_object_version                = aws_s3_object.this.version_id
  timeout                          = 30

  environment = {
    variables = {
      LOG_EXT_OPEN_SEARCH_URL = "https://logs.stroeer.engineering"
    }
  }

}

resource "aws_lambda_alias" "this" {
  description      = "Alias for the active Lambda version"
  function_name    = module.lambda.function_name
  function_version = module.lambda.version
  name             = local.environment
}


resource "aws_lambda_function_url" "production" {
  authorization_type = "NONE"
  function_name      = aws_lambda_alias.this.function_name
  qualifier          = aws_lambda_alias.this.name
  cors {
    allow_methods = ["GET"]
    allow_origins = ["*"]
  }
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
  source = local.zip_package
  etag   = filemd5(local.zip_package)

  lifecycle {
    ignore_changes = [etag, source, version_id, tags_all]
  }
}

module "deployment" {
  source  = "registry.terraform.io/moritzzimmer/lambda/aws//modules/deployment"
  version = "7.0.0"

  alias_name                                  = aws_lambda_alias.this.name
  codebuild_cloudwatch_logs_retention_in_days = 7
  codestar_notifications_target_arn           = data.aws_sns_topic.notifications.arn
  codepipeline_artifact_store_bucket          = data.aws_s3_bucket.pipeline_artifacts.bucket
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
locals {
  function_name = "image-handler${var.app_suffix}"
  environment   = "production"
  zip_package   = "../dist/image-handler.zip"
  s3_key        = "image-handler/${local.function_name}.zip"
}

module "lambda" {
  source  = "registry.terraform.io/moritzzimmer/lambda/aws"
  version = "6.10.0"

  architectures                     = ["x86_64"]
  cloudwatch_logs_retention_in_days = 1
  description                       = "provider of cute kitty pics."
  function_name                     = local.function_name
  ignore_external_function_updates  = true
  memory_size                       = 1024
  publish                           = true
  runtime                           = "nodejs14.x"
  handler                           = "index.handler"
  s3_bucket                         = data.aws_s3_bucket.ci.bucket
  s3_key                            = local.s3_key
  s3_object_version                 = aws_s3_object.this.version_id
  timeout                           = 30

  environment = {
    variables = {
      AUTO_WEBP      = "Yes"
      CORS_ENABLED   = "Yes"
      CORS_ORIGIN    = "*"
      SOURCE_BUCKETS = aws_s3_bucket.images.bucket
    }
  }

  cloudwatch_log_subscription_filters = {
    opensearch = {
      destination_arn = data.aws_lambda_function.log_streaming.arn
    }
  }
}

resource "aws_lambda_function_url" "production" {
  authorization_type = "NONE"
  function_name      = aws_lambda_alias.this.function_name
  qualifier          = aws_lambda_alias.this.name
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

  lifecycle {
    ignore_changes = [etag, source, version_id, tags_all]
  }
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
  version = "6.10.0"

  alias_name                                  = aws_lambda_alias.this.name
  codebuild_cloudwatch_logs_retention_in_days = 7
  codestar_notifications_target_arn           = data.aws_sns_topic.notifications.arn
  codepipeline_artifact_store_bucket          = data.aws_s3_bucket.pipeline_artifacts.bucket
  s3_bucket                                   = data.aws_s3_bucket.ci.bucket
  s3_key                                      = local.s3_key
  function_name                               = local.function_name
}

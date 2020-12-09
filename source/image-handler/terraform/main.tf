locals {
  function_name = "image-handler"
  artifact      = "${path.module}/../dist/image-handler.zip"
  s3_key        = "deployment/${local.function_name}.zip"

  default_tags = {
    managed_by   = "terraform"
    map-migrated = "d-server-00fvusu7ux3q9a"
    service      = local.function_name
    source       = "https://github.com/thisismana/${local.function_name}"
  }

}

resource "aws_s3_bucket" "this" {
  bucket        = "lambda-${local.function_name}-${data.aws_caller_identity.current.account_id}-${data.aws_region.current.name}"
  acl           = "private"
  force_destroy = true
  tags          = local.default_tags

  versioning {
    enabled = true
  }
}
resource "aws_s3_bucket_object" "function" {
  bucket = aws_s3_bucket.this.id
  etag   = filemd5(local.artifact)
  key    = local.s3_key
  source = local.artifact
  tags   = local.default_tags

  //  lifecycle {
  //    ignore_changes = [etag, version_id]
  //  }
}
resource "aws_lambda_alias" "live" {
  description      = "Alias for the active Lambda version"
  function_name    = module.lambda.function_name
  function_version = module.lambda.version
  name             = "live"

  lifecycle {
    ignore_changes = [function_version]
  }
}
resource "aws_s3_bucket" "images" {
  bucket        = "master-images-${data.aws_caller_identity.current.account_id}-${data.aws_region.current.name}"
  force_destroy = true
  tags          = local.default_tags

  versioning {
    enabled = false
  }
}
module "lambda" {
  source  = "moritzzimmer/lambda/aws"
  version = "5.6.0"

  description               = "provider of cute kitty pics."
  function_name             = local.function_name
  handler                   = "index.handler"
  log_retention_in_days     = 1
  logfilter_destination_arn = data.aws_lambda_function.log_streaming.arn
  memory_size               = 1024
  publish                   = true
  runtime                   = "nodejs12.x"
  s3_bucket                 = aws_s3_bucket.this.id
  s3_key                    = local.s3_key
  tags                      = local.default_tags
  timeout                   = 30
  tracing_config_mode       = "Active"
  environment               = {
    variables = {

      # this sets the default output to webp, which
      AUTO_WEBP = "Yes"

      CORS_ENABLED   = "Yes"
      CORS_ORIGIN    = "*"
      SOURCE_BUCKETS = aws_s3_bucket.images.bucket

//      ENABLE_DEFAULT_FALLBACK_IMAGE = "No"
//      DEFAULT_FALLBACK_IMAGE_BUCKET = aws_s3_bucket.images.bucket
//      DEFAULT_FALLBACK_IMAGE_KEY    = "default.svg"
    }
    //    CORS_ORIGIN = props.corsOriginParameter.valueAsString,
    //    REWRITE_MATCH_PATTERN= '',
    //    REWRITE_SUBSTITUTION= '',
    //    ENABLE_SIGNATURE= props.enableSignatureParameter.valueAsString,
    //    SECRETS_MANAGER= props.secretsManagerParameter.valueAsString,
    //    SECRET_KEY= props.secretsManagerKeyParameter.valueAsString,
    //    ENABLE_DEFAULT_FALLBACK_IMAGE= props.enableDefaultFallbackImageParameter.valueAsString,
    //    DEFAULT_FALLBACK_IMAGE_BUCKET= props.fallbackImageS3BucketParameter.valueAsString,
    //    DEFAULT_FALLBACK_IMAGE_KEY= props.fallbackImageS3KeyParameter.valueAsString
  }
}
module "deployment" {
  source = "./modules/deployment"

  alias_name                        = aws_lambda_alias.live.name
  codestar_notifications_target_arn = data.aws_sns_topic.notifications.arn
  function_name                     = module.lambda.function_name
  s3_bucket                         = aws_s3_bucket.this.id
  s3_key                            = local.s3_key
}


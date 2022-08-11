locals {
  function_name = "image-handler"
  environment   = "production"
  zip_package   = "../dist/image-handler.zip"
  s3_key        = "image-handler/image-handler.zip"
}

resource "aws_s3_bucket" "images" {
  bucket        = "master-images-${data.aws_caller_identity.current.account_id}-${data.aws_region.current.name}"
  force_destroy = false

  versioning {
    enabled = false
  }

  server_side_encryption_configuration {
    rule {
      bucket_key_enabled = false
      apply_server_side_encryption_by_default {
        sse_algorithm = "aws:kms"
      }
    }
  }
}

resource "aws_s3_bucket_public_access_block" "images" {
  block_public_acls       = true
  block_public_policy     = true
  bucket                  = aws_s3_bucket.images.id
  ignore_public_acls      = true
  restrict_public_buckets = true
}

module "lambda" {
  source  = "registry.terraform.io/moritzzimmer/lambda/aws"
  version = "6.1.0"

  architectures                      = ["x86_64"]
  cloudwatch_lambda_insights_enabled = true
  cloudwatch_logs_retention_in_days  = 1
  description                        = "provider of cute kitty pics."
  function_name                      = local.function_name
  ignore_external_function_updates   = true
  layers                             = [
    "arn:aws:lambda:${data.aws_region.current.name}:580247275435:layer:LambdaInsightsExtension:16"
  ]
  memory_size       = 1024
  publish           = true
  runtime           = "nodejs14.x"
  handler           = "index.handler"
  s3_bucket         = data.aws_s3_bucket.ci.bucket
  s3_key            = local.s3_key
  s3_object_version = aws_s3_bucket_object.this.version_id
  timeout           = 30

  environment = {
    variables = {
      AUTO_WEBP      = "Yes"
      AUTO_AVIF      = "Yes"
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

# ---------------------------------------------------------------------------------------------------------------------
# Deployment resources
# ---------------------------------------------------------------------------------------------------------------------

// this resource is only used for the initial `terraform apply` all further
// deployments are running on CodePipeline
resource "aws_s3_bucket_object" "this" {
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
  source  = "moritzzimmer/lambda/aws//modules/deployment"
  version = "6.1.0"

  alias_name                         = aws_lambda_alias.this.name
  codestar_notifications_target_arn  = data.aws_sns_topic.notifications.arn
  codepipeline_artifact_store_bucket = data.aws_s3_bucket.pipeline_artifacts.bucket
  s3_bucket                          = data.aws_s3_bucket.ci.bucket
  s3_key                             = local.s3_key
  function_name                      = local.function_name
}


resource "aws_s3_bucket_policy" "this" {
  bucket = aws_s3_bucket.images.id
  policy = data.aws_iam_policy_document.deny_insecure_transport.json
}

data "aws_iam_policy_document" "deny_insecure_transport" {

  statement {
    sid    = "denyInsecureTransport"
    effect = "Deny"

    actions = [
      "s3:*",
    ]

    resources = [aws_s3_bucket.images.arn, "${aws_s3_bucket.images.arn}/*"]

    principals {
      type        = "*"
      identifiers = ["*"]
    }

    condition {
      test     = "Bool"
      variable = "aws:SecureTransport"
      values   = ["false"]
    }
  }
}
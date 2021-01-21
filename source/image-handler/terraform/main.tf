locals {
  function_name = "image-handler"

  default_tags = {
    managed_by   = "terraform"
    map-migrated = "d-server-00fvusu7ux3q9a"
    service      = local.function_name
    source       = "https://github.com/stroeer/serverless-image-handler"
    App          = "Images"
  }

}

resource "aws_lambda_alias" "this" {
  description      = "Alias for the active Lambda version"
  function_name    = module.lambda.function_name
  function_version = module.lambda.version
  name             = var.docker_image_tag

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

resource "aws_ecr_repository" "this" {
  name = local.function_name
  tags = local.default_tags

  image_scanning_configuration {
    scan_on_push = true
  }
}

module "lambda" {
  source  = "moritzzimmer/lambda/aws"
  version = "5.9.0"

  description                      = "provider of cute kitty pics."
  function_name                    = local.function_name
  ignore_external_function_updates = true
  image_uri                        = "${aws_ecr_repository.this.repository_url}:${var.docker_image_tag}"
  log_retention_in_days            = 1
  logfilter_destination_arn        = data.aws_lambda_function.log_streaming.arn
  memory_size                      = 1024
  publish                          = true
  package_type                     = "Image"
  tags                             = local.default_tags
  timeout                          = 30
  tracing_config_mode              = "Active"

  environment = {
    variables = {
      AUTO_WEBP      = "Yes"
      CORS_ENABLED   = "Yes"
      CORS_ORIGIN    = "*"
      SOURCE_BUCKETS = aws_s3_bucket.images.bucket
    }
  }
}

module "deployment" {
  source     = "moritzzimmer/lambda/aws//modules/deployment"
  version    = "5.9.0"
  depends_on = [module.lambda]

  alias_name                        = aws_lambda_alias.this.name
  codestar_notifications_target_arn = data.aws_sns_topic.notifications.arn
  ecr_image_tag                     = var.docker_image_tag
  ecr_repository_name               = aws_ecr_repository.this.name
  function_name                     = local.function_name
}

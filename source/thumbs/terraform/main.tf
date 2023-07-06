locals {
  function_name = "image-thumbs${var.app_suffix}"
  environment   = "production"
  zip_package   = "../target/lambda/arm64/thumbs/bootstrap.zip"
  s3_key        = "image-handler/${local.function_name}.zip"
}

module "lambda" {
  source  = "registry.terraform.io/moritzzimmer/lambda/aws"
  version = "6.11.0"

  architectures = ["arm64"]
  layers        = [
    "arn:aws:lambda:eu-west-1:053041861227:layer:CustomLoggingExtensionOpenSearch-Arm64:10"
  ]
  cloudwatch_logs_enabled          = false
  description                      = "provider of cute kitty thumbs."
  function_name                    = local.function_name
  ignore_external_function_updates = false
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
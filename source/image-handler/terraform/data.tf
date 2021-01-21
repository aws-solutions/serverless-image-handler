data "aws_region" "current" {}
data "aws_caller_identity" "current" {}

data "aws_lambda_function" "log_streaming" {
  function_name = "lambda-logs-to-elasticsearch"
}
data "aws_sns_topic" "notifications" {
  name = "codestar-notifications"
}

data "aws_route53_zone" "external" {
  name = "stroeer.engineering"
}
data "aws_iam_role" "code_build" {
  name = "codebuild_role"
}

data "aws_iam_role" "code_pipeline" {
  name = "codepipeline_role"
}

data "aws_s3_bucket" "pipeline_artifacts" {
  bucket = "codepipeline-bucket-${data.aws_caller_identity.current.account_id}-${data.aws_region.current.name}"
}
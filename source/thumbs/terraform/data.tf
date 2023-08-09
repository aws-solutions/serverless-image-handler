data "aws_s3_bucket" "ci" {
  bucket = "ci-${var.account_id}-${var.region}"
}

data "aws_sns_topic" "notifications" {
  name = "codestar-notifications"
}

data "aws_s3_bucket" "pipeline_artifacts" {
  bucket = "codepipeline-bucket-${var.account_id}-${var.region}"
}
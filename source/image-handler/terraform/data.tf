data "aws_region" "current" {}
data "aws_caller_identity" "current" {}

data "aws_lambda_function" "log_streaming" {
  function_name = "lambda-logs-to-opensearch"
}

data "aws_sns_topic" "notifications" {
  name = "codestar-notifications"
}

data "aws_s3_bucket" "pipeline_artifacts" {
  bucket = "codepipeline-bucket-${data.aws_caller_identity.current.account_id}-${data.aws_region.current.name}"
}

data "aws_s3_bucket" "ci" {
  bucket = "ci-${data.aws_caller_identity.current.account_id}-${data.aws_region.current.name}"
}

data "aws_vpc" "selected" {
  tags = {
    Name = "main"
  }
}

data "aws_subnets" "selected" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.selected.id]
  }

  tags = {
    Tier = "private"
  }
}


data "aws_security_group" "vpc_endpoints" {
  name = "vpc-endpoint-access"
}

data "aws_security_group" "all_outbound" {
  name = "allow-outbound-tcp"
}

data "aws_security_group" "lambda" {
  name = "lambda-default"
}

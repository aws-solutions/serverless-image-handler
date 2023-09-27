data "aws_sns_topic" "notifications" {
  name = "codestar-notifications"
}

data "aws_s3_bucket" "pipeline_artifacts" {
  bucket = "codepipeline-bucket-${var.account_id}-${var.region}"
}

data "aws_s3_bucket" "ci" {
  bucket = "ci-${var.account_id}-${var.region}"
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

data "aws_cloudfront_distribution" "images" {
  id = "E3K0UX29CMXL6T"
}

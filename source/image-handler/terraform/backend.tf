terraform {
  backend "s3" {
    encrypt        = true
    dynamodb_table = "terraform-lock"
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5"
    }
    opensearch = {
      source  = "opensearch-project/opensearch"
      version = "~> 2"
    }
  }

  required_version = "~> 1.0"
}

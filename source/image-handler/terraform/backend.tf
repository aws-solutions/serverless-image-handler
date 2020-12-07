terraform {
  backend "s3" {
    encrypt        = true
    dynamodb_table = "terraform-lock"
    key            = "regional/lambda/el-dub-tor/terraform.tfstate"
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 3.1"
    }
  }

  required_version = "~> 0.13"
}

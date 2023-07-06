data "aws_s3_bucket" "ci" {
  bucket = "ci-${var.account_id}-${var.region}"
}
#data "aws_s3_bucket" "images" {
#  bucket = "master-images-${data.aws_caller_identity.current.account_id}-${data.aws_region.current.name}"
#}

resource "aws_s3_bucket" "images" {
  bucket        = "master-images-${data.aws_caller_identity.current.account_id}-${data.aws_region.current.name}"
  force_destroy = false
}

resource "aws_s3_bucket_versioning" "images" {
  bucket = aws_s3_bucket.images.bucket

  versioning_configuration {
    status = "Suspended"
  }
}

#tfsec:ignore:aws-s3-encryption-customer-key
resource "aws_s3_bucket_server_side_encryption_configuration" "images" {
  bucket = aws_s3_bucket.images.bucket
  rule {
    bucket_key_enabled = false
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
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
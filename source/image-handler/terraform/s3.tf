resource "aws_s3_bucket" "images" {
  count         = var.app_suffix == "" ? 1 : 0
  bucket        = "master-images-${var.account_id}-${var.region}"
  force_destroy = false
}

resource "aws_s3_bucket_versioning" "images" {
  count  = var.app_suffix == "" ? 1 : 0
  bucket = aws_s3_bucket.images[count.index].bucket

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "images" {
  count = var.app_suffix == "" ? 1 : 0

  bucket = aws_s3_bucket.images[count.index].bucket
  rule {
    id     = "delete_old_versions"
    status = "Enabled"

    expiration {
      expired_object_delete_marker = true
    }
    noncurrent_version_expiration {
      noncurrent_days = 14
    }
  }
}

resource "aws_kms_key" "images" {
  count                   = var.app_suffix == "" ? 1 : 0
  description             = "This key is used to encrypt bucket objects within the ${aws_s3_bucket.images[count.index].bucket} bucket."
  deletion_window_in_days = 30
  enable_key_rotation     = true
}

resource "aws_kms_alias" "images" {
  count         = var.app_suffix == "" ? 1 : 0
  target_key_id = aws_kms_key.images[count.index].key_id
  name          = "alias/s3_image_bucket"
}

resource "aws_kms_key_policy" "images" {
  count  = var.app_suffix == "" ? 1 : 0
  key_id = aws_kms_key.images[count.index].id
  policy = jsonencode({
    Id = "User"
    Statement = [
      {
        "Sid" : "Allow direct access to key metadata to the account",
        "Effect" : "Allow",
        "Principal" : {
          "AWS" : "arn:aws:iam::${var.account_id}:root"
        },
        "Action" : ["kms:*"],
        "Resource" : "*"
      },
      {
        "Sid" : "Allow CloudFront to use this key",
        "Effect" : "Allow",
        "Principal" : {
          "Service" : ["cloudfront.amazonaws.com"]
        },
        "Action" : [
          "kms:Decrypt",
          "kms:Encrypt",
          "kms:GenerateDataKey*"
        ],
        "Resource" : "*",
        "Condition" : {
          "StringEquals" : {
            "aws:SourceArn" : data.aws_cloudfront_distribution.images.arn
          }
        }
      },
      {
        "Sid" : "Allow access through S3 for all principals in the account that are authorized to use S3",
        "Effect" : "Allow",
        "Principal" : {
          "AWS" : "*"
        },
        "Action" : [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ],
        "Resource" : "*",
        "Condition" : {
          "StringEquals" : {
            "kms:CallerAccount" : var.account_id
            "kms:ViaService" : "s3.eu-west-1.amazonaws.com"
          }
        }
      }
    ]
    Version = "2012-10-17"
  })
}

resource "aws_s3_bucket_server_side_encryption_configuration" "images" {
  count  = var.app_suffix == "" ? 1 : 0
  bucket = aws_s3_bucket.images[count.index].bucket
  rule {
    bucket_key_enabled = true
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.images[count.index].arn
    }
  }
}

resource "aws_s3_bucket_public_access_block" "images" {
  count                   = var.app_suffix == "" ? 1 : 0
  block_public_acls       = true
  block_public_policy     = true
  bucket                  = aws_s3_bucket.images[count.index].id
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_policy" "this" {
  count  = var.app_suffix == "" ? 1 : 0
  bucket = aws_s3_bucket.images[count.index].id
  policy = data.aws_iam_policy_document.deny_insecure_transport[count.index].json
}

data "aws_iam_policy_document" "deny_insecure_transport" {
  count = var.app_suffix == "" ? 1 : 0
  statement {
    sid    = "denyInsecureTransport"
    effect = "Deny"

    actions = [
      "s3:*",
    ]

    resources = [aws_s3_bucket.images[count.index].arn, "${aws_s3_bucket.images[count.index].arn}/*"]

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

  statement {
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.images[count.index].arn}/*"]
    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }
    condition {
      variable = "AWS:SourceArn"
      test     = "StringEquals"
      values   = [data.aws_cloudfront_distribution.images.arn]
    }
    sid = "AllowCloudFrontServicePrincipalReadOnly"
  }
}

resource "aws_s3_object" "robots_txt" {
  count         = var.app_suffix == "" ? 1 : 0
  bucket        = aws_s3_bucket.images[count.index].bucket
  key           = "robots.txt"
  cache_control = "max-age=60" # todo ~> increase this

  content_type = "text/plain"
  content      = <<EOF
User-agent: *
Disallow: /authors/
EOF
}

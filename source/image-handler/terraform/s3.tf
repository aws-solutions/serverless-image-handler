resource "aws_s3_bucket" "images" {
  bucket        = "master-images-${var.account_id}-${var.region}"
  force_destroy = false
}

resource "aws_s3_bucket_versioning" "images" {
  bucket = aws_s3_bucket.images.bucket

  versioning_configuration {
    status = "Suspended"
  }
}

resource "aws_kms_key" "images" {
  description             = "This key is used to encrypt bucket objects within the ${aws_s3_bucket.images.bucket} bucket."
  deletion_window_in_days = 10
}

resource "aws_kms_alias" "images" {
  target_key_id = aws_kms_key.images.key_id
  name          = "alias/s3_image_bucket"
}

resource "aws_kms_key_policy" "images" {
  key_id = aws_kms_key.images.id
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
  bucket = aws_s3_bucket.images.bucket
  rule {
    bucket_key_enabled = false
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.images.arn
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

  statement {
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.images.arn}/*"]
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
  bucket        = aws_s3_bucket.images.bucket
  key           = "robots.txt"
  cache_control = "max-age=60" # todo ~> increase this

  content_type = "text/plain"
  content      = <<EOF
User-agent: *
Disallow: /authors/
EOF
}
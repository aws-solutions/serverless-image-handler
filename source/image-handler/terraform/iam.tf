data "aws_iam_policy_document" "lambda" {
  statement {
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.images.arn}/*"]
  }
  statement {
    actions   = ["s3:ListBucket"]
    resources = [aws_s3_bucket.images.arn]
  }
}

resource "aws_iam_policy" "lambda" {
  description = "${local.function_name} Permissions"
  name        = "${module.lambda.function_name}-${var.region}"
  policy      = data.aws_iam_policy_document.lambda.json
}

resource "aws_iam_role_policy_attachment" "rekognition" {
  role       = module.lambda.role_name
  policy_arn = aws_iam_policy.lambda.arn
}
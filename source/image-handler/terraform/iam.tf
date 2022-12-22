data "aws_iam_policy_document" "rekognition" {
  statement {
    actions = [
      "rekognition:DetectFaces"
    ]
    resources = [
      "*"
    ]
  }

  statement {
    # FIXME (MaNa, buzz-end): can we restrict this to concrete actions?  https://aquasecurity.github.io/tfsec/v1.28.1/checks/aws/iam/no-policy-wildcards/
    actions = [
      "s3:*"
    ]

    resources = [
      aws_s3_bucket.images.arn,
      "${aws_s3_bucket.images.arn}/*"
    ]
  }
}

resource "aws_iam_policy" "rekognition" {
  description = "rekognition DetectFaces"
  name        = "${module.lambda.function_name}-rekognition-faces-${data.aws_region.current.name}"
  policy      = data.aws_iam_policy_document.rekognition.json
}

resource "aws_iam_role_policy_attachment" "rekognition" {
  role       = module.lambda.role_name
  policy_arn = aws_iam_policy.rekognition.arn
}
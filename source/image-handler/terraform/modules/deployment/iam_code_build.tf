locals {
  create_code_build_iam = var.enabled && var.code_build_role == ""
}

resource "aws_iam_role" "code_build_role" {
  count              = local.create_code_build_iam ? 1 : 0
  name               = "code-build-${var.function_name}"
  path               = local.iam_path
  assume_role_policy = data.aws_iam_policy_document.allow_code_build_assume[count.index].json

  tags = merge(var.tags, {
    tf_module = basename(path.module)
  })
}

data "aws_iam_policy_document" "allow_code_build_assume" {
  count = local.create_code_build_iam ? 1 : 0
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["codebuild.amazonaws.com"]
    }
  }
}

resource "aws_iam_policy" "codebuild" {
  count  = local.create_code_build_iam ? 1 : 0
  name   = "codebuild-${var.function_name}"
  path   = local.iam_path
  policy = data.aws_iam_policy_document.codebuild[count.index].json
}

resource "aws_iam_role_policy_attachment" "codebuild" {
  count      = local.create_code_build_iam ? 1 : 0
  role       = aws_iam_role.code_build_role[count.index].name
  policy_arn = aws_iam_policy.codebuild[count.index].arn
}

data "aws_iam_policy_document" "codebuild" {
  count = local.create_code_build_iam ? 1 : 0
  statement {
    actions = ["logs:CreateLogStream", "logs:CreateLogGroup", "logs:PutLogEvents"]

    resources = [
      "arn:aws:logs:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:log-group:/aws/codebuild/*"
    ]
  }
  statement {
    actions = ["s3:Get*", "s3:PutObject"]

    resources = ["${local.artifact_bucket_arn}/*"]
  }
}

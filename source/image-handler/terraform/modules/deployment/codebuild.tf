resource "aws_cloudwatch_log_group" "codebuild" {
  name              = "/aws/codebuild/${var.function_name}-codebuild"
  retention_in_days = 7
  tags              = var.tags
}

resource "aws_codebuild_project" "this" {
  description  = "Creates AppSpec CodeDeploy configuration for ${var.function_name}"
  name         = var.function_name
  service_role = aws_iam_role.codebuild.arn
  tags         = var.tags

  artifacts {
    type = "CODEPIPELINE"
  }

  environment {
    compute_type = "BUILD_GENERAL1_SMALL"
    image        = "aws/codebuild/amazonlinux2-x86_64-standard:3.0"
    type         = "LINUX_CONTAINER"
  }

  logs_config {
    cloudwatch_logs {
      group_name = aws_cloudwatch_log_group.codebuild.name
      status     = "ENABLED"
    }

    s3_logs {
      status = "DISABLED"
    }
  }

  source {
    type      = "CODEPIPELINE"
    buildspec = <<BUILDSPEC
version: 0.2

phases:
  build:
    commands:
      - zip -r artifact.zip .
      - targetVersion=$(aws lambda update-function-code --function-name ${var.function_name} --zip-file fileb://artifact.zip --publish --region ${data.aws_region.current.name} --output text --query Version | awk '{print $1}')
      - currentVersion=$(aws lambda get-alias --function-name ${var.function_name} --name ${var.alias_name} --region ${data.aws_region.current.name} --output text --query FunctionVersion | awk '{print $1}')
      - echo '{"revisionType":"AppSpecContent","appSpecContent":{"content":"{\"Resources\":[{\"function\":{\"Properties\":{\"Alias\":\"${var.alias_name}\",\"CurrentVersion\":\"CURRENT_VERSION\",\"Name\":\"${var.function_name}\",\"TargetVersion\":\"TARGET_VERSION\"},\"Type\":\"AWS::Lambda::Function\"}}]}"}}' > revision.json
      - sed -i "s/CURRENT_VERSION/$currentVersion/" revision.json
      - sed -i "s/TARGET_VERSION/$targetVersion/" revision.json
      - cat revision.json
      - |
        aws deploy create-deployment \
          --application-name ${var.function_name} \
          --deployment-group-name ${aws_codedeploy_deployment_group.this.deployment_group_name} \
          --revision file://revision.json \
          --output text \
          --query '[deploymentId]' \
          --region ${data.aws_region.current.name}
BUILDSPEC
  }
}

data "aws_iam_policy_document" "codebuild" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["codebuild.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "codebuild" {
  assume_role_policy = data.aws_iam_policy_document.codebuild.json
  name               = "${var.function_name}-codebuild-${data.aws_region.current.name}"
  tags               = var.tags
}

data "aws_iam_policy_document" "codebuild_permissions" {
  statement {
    actions = [
      "logs:CreateLogStream",
      "logs:CreateLogGroup",
      "logs:PutLogEvents"
    ]

    resources = [
      "${aws_cloudwatch_log_group.codebuild.arn}:*"
    ]
  }

  statement {
    actions = [
      "s3:Get*",
      "s3:ListBucket",
      "s3:PutObject"
    ]

    resources = [
      "arn:aws:s3:::${var.s3_bucket}/*"
    ]
  }

  statement {
    actions = [
      "lambda:GetAlias",
      "lambda:PublishVersion",
      "lambda:UpdateFunctionCode"
    ]

    resources = [
      "arn:aws:lambda:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:function:${var.function_name}"
    ]
  }

  statement {
    actions = [
      "codedeploy:CreateDeployment"
    ]

    resources = [
      "arn:aws:codedeploy:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:deploymentgroup:${aws_codedeploy_app.this.name}/${aws_codedeploy_deployment_group.this.deployment_group_name}"
    ]
  }

  statement {
    actions = [
      "codedeploy:GetDeploymentConfig"
    ]

    resources = [
      "arn:aws:codedeploy:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:deploymentconfig:${var.deployment_config_name}"
    ]
  }

  statement {
    actions = [
      "codedeploy:GetApplicationRevision",
      "codedeploy:RegisterApplicationRevision"
    ]

    resources = [
      "arn:aws:codedeploy:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:application:${aws_codedeploy_app.this.name}"
    ]
  }
}

resource "aws_iam_policy" "codebuild" {
  policy = data.aws_iam_policy_document.codebuild_permissions.json
}

resource "aws_iam_role_policy_attachment" "codebuild" {
  role       = aws_iam_role.codebuild.name
  policy_arn = aws_iam_policy.codebuild.arn
}

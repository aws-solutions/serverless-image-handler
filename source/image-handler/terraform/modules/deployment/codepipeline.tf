locals {
  cloudtrail_s3_prefix = "cloudtrail"
}

resource "aws_codepipeline" "this" {
  name     = var.function_name
  role_arn = aws_iam_role.codepipeline.arn
  tags     = var.tags

  artifact_store {
    location = var.s3_bucket
    type     = "S3"
  }

  stage {
    name = "Source"

    action {
      category         = "Source"
      name             = "Source"
      output_artifacts = ["source_artifact"]
      owner            = "AWS"
      provider         = "S3"
      version          = "1"

      configuration = {
        S3Bucket             = var.s3_bucket
        S3ObjectKey          = var.s3_key
        PollForSourceChanges = "false"
      }
    }
  }

  stage {
    name = "Deploy"

    action {
      category        = "Build"
      input_artifacts = ["source_artifact"]
      name            = "Build"
      owner           = "AWS"
      provider        = "CodeBuild"
      version         = "1"
      //      output_artifacts = ["app_spec"]

      configuration = {
        ProjectName = aws_codebuild_project.this.name
      }
    }
  }

  // we can't use a CodeDeploy stage here because of https://forums.aws.amazon.com/thread.jspa?messageID=864336
  // as a workaround, we'll call 'aws deploy create-deployment' directly from CodeBuild stage
  //  stage {
  //    name = "Deploy"
  //
  //    action {
  //      category        = "Deploy"
  //      input_artifacts = ["app_spec"]
  //      name            = "Deploy"
  //      owner           = "AWS"
  //      provider        = "CodeDeploy"
  //      version         = "1"
  //
  //      configuration = {
  //        ApplicationName     = aws_codedeploy_app.this.name
  //        DeploymentGroupName = aws_codedeploy_deployment_group.this.deployment_group_name
  //      }
  //    }
  //  }
}

data "aws_iam_policy_document" "codepipeline" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["codepipeline.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "codepipeline" {
  name               = "${var.function_name}-codepipeline-${data.aws_region.current.name}"
  assume_role_policy = data.aws_iam_policy_document.codepipeline.json
  tags               = var.tags
}

data "aws_iam_policy_document" "codepipepline_permissions" {
  statement {
    actions = [
      "s3:*"
    ]

    resources = [
      "arn:aws:s3:::${var.s3_bucket}/*",
      "arn:aws:s3:::${var.s3_bucket}"
    ]
  }

  statement {
    actions = [
      "codebuild:BatchGetBuilds",
      "codebuild:StartBuild",
      "codebuild:BatchGetBuildBatches",
      "codebuild:StartBuildBatch"
    ]

    resources = [
      aws_codebuild_project.this.arn
    ]
  }
}

resource "aws_iam_policy" "codepipeline" {
  policy = data.aws_iam_policy_document.codepipepline_permissions.json
}

resource "aws_iam_role_policy_attachment" "codepipeline" {
  role       = aws_iam_role.codepipeline.name
  policy_arn = aws_iam_policy.codepipeline.arn
}

# ---------------------------------------------------------------------------------------------------------------------
# Resources needed to trigger CodePipeline via EventBridge
# see https://docs.aws.amazon.com/codepipeline/latest/userguide/update-change-detection.html for details
# ---------------------------------------------------------------------------------------------------------------------

resource "aws_cloudwatch_event_rule" "codepipeline" {
  name        = "${var.function_name}-codepipeline-trigger"
  description = "Amazon CloudWatch Events rule to automatically start the pipeline when a change occurs in the Amazon S3 object key or S3 folder."
  tags        = var.tags

  event_pattern = <<EOF
{
  "source": [
    "aws.s3"
  ],
  "detail-type": [
    "AWS API Call via CloudTrail"
  ],
  "detail": {
    "eventSource": [
      "s3.amazonaws.com"
    ],
    "eventName": [
      "PutObject",
      "CompleteMultipartUpload",
      "CopyObject"
    ],
    "requestParameters": {
      "bucketName": [
        "${var.s3_bucket}"
      ],
      "key": [
        "${var.s3_key}"
      ]
    }
  }
}
EOF
}

resource "aws_cloudwatch_event_target" "codepipeline" {
  arn      = aws_codepipeline.this.arn
  role_arn = aws_iam_role.eventbridge.arn
  rule     = aws_cloudwatch_event_rule.codepipeline.name
}

data "aws_iam_policy_document" "eventbridge" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["events.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "eventbridge" {
  name               = "${var.function_name}-eventbridge-${data.aws_region.current.name}"
  assume_role_policy = data.aws_iam_policy_document.eventbridge.json
  tags               = var.tags
}

data "aws_iam_policy_document" "eventbridge_permissions" {
  statement {
    actions = [
      "codepipeline:StartPipelineExecution"
    ]

    resources = [
      aws_codepipeline.this.arn
    ]
  }
}

resource "aws_iam_policy" "eventbridge" {
  policy = data.aws_iam_policy_document.eventbridge_permissions.json
}

resource "aws_iam_role_policy_attachment" "eventbridge" {
  role       = aws_iam_role.eventbridge.name
  policy_arn = aws_iam_policy.eventbridge.arn
}

resource "aws_cloudtrail" "cloudtrail" {
  depends_on = [aws_s3_bucket_policy.cloudtrail_policy]

  include_global_service_events = false
  name                          = "${var.function_name}-codepipeline-source-trail"
  s3_bucket_name                = var.s3_bucket
  s3_key_prefix                 = local.cloudtrail_s3_prefix
  tags                          = var.tags

  event_selector {
    read_write_type           = "WriteOnly"
    include_management_events = false

    data_resource {
      type   = "AWS::S3::Object"
      values = ["arn:aws:s3:::${var.s3_bucket}/${var.s3_key}"]
    }
  }
}

resource "aws_s3_bucket_policy" "cloudtrail_policy" {
  bucket = var.s3_bucket
  policy = data.aws_iam_policy_document.cloudtrail.json
}

data "aws_iam_policy_document" "cloudtrail" {
  statement {
    actions = ["s3:GetBucketAcl"]

    principals {
      identifiers = ["cloudtrail.amazonaws.com"]
      type        = "Service"
    }

    resources = [
      "arn:aws:s3:::${var.s3_bucket}"
    ]
  }

  statement {
    actions = ["s3:PutObject"]

    condition {
      test     = "StringEquals"
      values   = ["bucket-owner-full-control"]
      variable = "s3:x-amz-acl"
    }

    principals {
      identifiers = ["cloudtrail.amazonaws.com"]
      type        = "Service"
    }

    resources = [
      "arn:aws:s3:::${var.s3_bucket}/${local.cloudtrail_s3_prefix}/AWSLogs/${data.aws_caller_identity.current.account_id}/*"
    ]
  }
}

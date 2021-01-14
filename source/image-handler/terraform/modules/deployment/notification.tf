data "aws_iam_policy_document" "sns_codestar_policy" {
  count = var.enabled && var.codestar_notifications_target_arn == "" ? 1 : 0

  statement {
    actions = ["sns:Publish"]

    principals {
      type        = "Service"
      identifiers = ["codestar-notifications.amazonaws.com"]
    }

    resources = [aws_sns_topic.notifications[count.index].arn]
  }
}

resource "aws_codestarnotifications_notification_rule" "notification" {
  count = var.enabled ? 1 : 0

  detail_type    = var.codestar_notifications_detail_type
  event_type_ids = var.codestar_notifications_event_type_ids
  name           = "${var.function_name}-notifications-${data.aws_region.current.name}"
  resource       = aws_codepipeline.codepipeline[count.index].arn

  tags = merge(var.tags, {
    tf_module = basename(path.module)
  })

  target {
    address = var.codestar_notifications_target_arn == "" ? aws_sns_topic.notifications[count.index].arn : var.codestar_notifications_target_arn
  }
}

resource "aws_sns_topic" "notifications" {
  count = var.enabled && var.codestar_notifications_target_arn == "" ? 1 : 0

  name = "${var.function_name}-notifications"
  tags = merge(var.tags, {
    tf_module = basename(path.module)
  })
}

resource "aws_sns_topic_policy" "notifications" {
  count = var.enabled && var.codestar_notifications_target_arn == "" ? 1 : 0

  arn    = aws_sns_topic.notifications[count.index].arn
  policy = data.aws_iam_policy_document.sns_codestar_policy[count.index].json
}

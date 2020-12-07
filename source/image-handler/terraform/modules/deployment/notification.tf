resource "aws_codestarnotifications_notification_rule" "notification" {
  count = var.codestar_notifications_target_arn != "" ? 1 : 0

  detail_type    = var.codestar_notifications_detail_type
  event_type_ids = var.codestar_notifications_event_type_ids
  name           = "${var.function_name}-notifications"
  resource       = aws_codepipeline.this.arn
  tags           = var.tags

  target {
    address = var.codestar_notifications_target_arn
  }
}

data "aws_region" "current" {}
data "aws_caller_identity" "current" {}
data "aws_lambda_function" "log_streaming" {
  function_name = "lambda-logs-to-elasticsearch"
}
data "aws_sns_topic" "notifications" {
  name = "codestar-notifications"
}
output "function_url" {
  value = aws_lambda_function_url.production.function_url
}

resource "aws_ssm_parameter" "function_url" {
  name = "/internal/image-handler/thumbnail/function_url"
  value = aws_lambda_function_url.production.function_url
  type = "String"
}
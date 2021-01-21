resource "aws_apigatewayv2_api" "this" {
  name          = "image handler"
  protocol_type = "HTTP"
  tags          = local.default_tags

  cors_configuration {
    allow_credentials = false
    allow_headers     = ["*"]
    allow_methods     = ["*"]
    allow_origins     = ["*"]
    expose_headers    = ["*"]
    max_age           = 3600
  }
}

resource "aws_apigatewayv2_route" "this" {
  api_id    = aws_apigatewayv2_api.this.id
  route_key = "GET /{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.this.id}"
}

resource "aws_apigatewayv2_integration" "this" {
  api_id           = aws_apigatewayv2_api.this.id
  integration_type = "AWS_PROXY"

  description            = "This is our {proxy+} integration"
  integration_method     = "POST"
  integration_uri        = aws_lambda_alias.this.arn
  passthrough_behavior   = "WHEN_NO_MATCH"
  payload_format_version = "1.0"

  lifecycle {
    ignore_changes = [
      passthrough_behavior
    ]
  }
}

resource "aws_apigatewayv2_domain_name" "this" {
  domain_name = "j.stroeer.engineering"

  domain_name_configuration {
    certificate_arn = data.aws_acm_certificate.public.arn
    endpoint_type   = "REGIONAL"
    security_policy = "TLS_1_2"
  }
}

resource "aws_apigatewayv2_stage" "prod" {
  api_id      = aws_apigatewayv2_api.this.id
  name        = "prod"
  auto_deploy = true

  default_route_settings {
    throttling_burst_limit = 5000
    throttling_rate_limit  = 10000
  }
  stage_variables = {
    deployed_at = timestamp()
  }
  route_settings {
    detailed_metrics_enabled = true
    route_key                = aws_apigatewayv2_route.this.route_key
    throttling_burst_limit   = 5000
    throttling_rate_limit    = 10000
  }
}

// bind an api stage to a custom domain
resource "aws_apigatewayv2_api_mapping" "example" {
  api_id      = aws_apigatewayv2_api.this.id
  domain_name = aws_apigatewayv2_domain_name.this.id
  stage       = aws_apigatewayv2_stage.prod.id
}

resource "aws_route53_record" "public" {
  name    = aws_apigatewayv2_domain_name.this.domain_name
  type    = "A"
  zone_id = data.aws_route53_zone.external.zone_id

  alias {
    name                   = aws_apigatewayv2_domain_name.this.domain_name_configuration[0].target_domain_name
    zone_id                = aws_apigatewayv2_domain_name.this.domain_name_configuration[0].hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "public_v6" {
  name    = aws_apigatewayv2_domain_name.this.domain_name
  type    = "AAAA"
  zone_id = data.aws_route53_zone.external.zone_id

  alias {
    name                   = aws_apigatewayv2_domain_name.this.domain_name_configuration[0].target_domain_name
    zone_id                = aws_apigatewayv2_domain_name.this.domain_name_configuration[0].hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_lambda_permission" "with_api_gateway" {
  statement_id  = "AllowExecutionFromApiGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_alias.this.arn
  principal     = "apigateway.amazonaws.com"
  source_arn    = "arn:aws:execute-api:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:${aws_apigatewayv2_api.this.id}/*/*/*"
}

data "aws_acm_certificate" "public" {
  domain   = "stroeer.engineering"
  statuses = ["ISSUED"]
}
resource "aws_codedeploy_app" "this" {
  name             = var.function_name
  compute_platform = "Lambda"
}

resource "aws_codedeploy_deployment_group" "this" {
  app_name               = var.function_name
  deployment_config_name = var.deployment_config_name
  deployment_group_name  = var.alias_name
  service_role_arn       = aws_iam_role.codedeploy.arn

  deployment_style {
    deployment_option = "WITH_TRAFFIC_CONTROL"
    deployment_type   = "BLUE_GREEN"
  }
}

data "aws_iam_policy_document" "codedeploy" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["codedeploy.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "codedeploy" {
  assume_role_policy = data.aws_iam_policy_document.codedeploy.json
  name               = "${var.function_name}-codedeploy-${data.aws_region.current.name}"
  tags               = var.tags
}

resource "aws_iam_role_policy_attachment" "codedeploy" {
  role       = aws_iam_role.codedeploy.id
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSCodeDeployRoleForLambda"
}

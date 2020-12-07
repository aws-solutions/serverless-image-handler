resource "aws_alb_target_group" "this" {
  name        = "img-demo"
  target_type = "lambda"
}

resource "aws_alb_target_group_attachment" "this" {
  target_group_arn = aws_alb_target_group.this.arn
  target_id        = aws_lambda_alias.live.arn
  depends_on       = [aws_lambda_permission.with_alb]
}

data "aws_route53_zone" "external" {
  name = "stroeer.engineering"
}

resource "aws_route53_record" "i" {
  name    = "i"
  type    = "CNAME"
  zone_id = data.aws_route53_zone.external.id
  ttl     = 300
  records = [data.aws_lb.public.dns_name]

}

data "aws_lb_listener" "public" {
  load_balancer_arn = data.aws_lb.public.arn
  port              = 443
}

data "aws_lb" "public" {
  name = "public"
}

resource "aws_alb_listener_rule" "this" {

  listener_arn = data.aws_lb_listener.public.arn
  priority     = 943

  action {
    type             = "forward"
    target_group_arn = aws_alb_target_group.this.arn
  }

  condition {
    host_header {
      values = toset([aws_route53_record.i.fqdn])
    }
  }
}

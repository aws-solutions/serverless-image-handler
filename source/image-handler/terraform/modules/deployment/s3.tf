module "s3_bucket" {
  source        = "terraform-aws-modules/s3-bucket/aws"
  create_bucket = var.enabled && var.artifact_bucket == "" ? true : false

  bucket        = "codepipeline-bucket-${var.function_name}-${data.aws_caller_identity.current.account_id}-${data.aws_region.current.name}"
  force_destroy = true

  tags = merge(var.tags, {
    tf_module = basename(path.module)
  })
}

data "aws_s3_bucket" "codepipeline" {
  count  = var.enabled && var.artifact_bucket != "" ? 1 : 0
  bucket = var.artifact_bucket
}
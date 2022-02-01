locals {
  # idea here is to provide each team with its own distinct role
  # to allow them publishing static assets under their team directory, e.g. /s/dcp/
  teams = {
    "newbiz-product-images" = {
      account_id = 786771379108
    }
  }
}

resource "aws_iam_role" "s3_org_access" {
  for_each = local.teams

  name = "s3-images-access-team-${each.key}-${data.aws_region.current.name}"
  path = "/cdn/"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Action = "sts:AssumeRole",
        Principal = {
          "AWS" : "arn:aws:iam::${each.value["account_id"]}:root"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "s3_org_access" {
  for_each = local.teams

  role       = aws_iam_role.s3_org_access[each.key].name
  policy_arn = aws_iam_policy.s3_org_access[each.key].arn
}

resource "aws_iam_policy" "s3_org_access" {
  for_each = local.teams

  path = "/cdn/"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action   = ["s3:*Object"]
        Effect   = "Allow"
        Resource = "${aws_s3_bucket.images.arn}/${each.key}/*"
        Sid : "ImageWriteAssetsAccessTeam${replace(title(each.key), "-", "")}"
      }
    ]
  })
}
provider "aws" {
  region = var.region

  default_tags {
    tags = {
      managed_by   = "terraform"
      map-migrated = "d-server-00fvusu7ux3q9a"
      service      = local.function_name
      source       = "https://github.com/stroeer/serverless-image-handler"
      App          = "Images"
    }
  }

}

provider "opensearch" {
  aws_region  = var.region
  healthcheck = true
  url         = "https://logs.stroeer.engineering"
}

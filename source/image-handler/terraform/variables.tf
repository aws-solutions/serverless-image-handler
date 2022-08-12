variable "region" {
  validation {
    condition     = var.region == "eu-west-1"
    error_message = "Only Ireland region is currently supported."
  }
}

variable "app_suffix" {
  description = "Deployment variant"
}
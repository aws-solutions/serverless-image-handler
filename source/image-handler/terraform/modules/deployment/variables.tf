# ---------------------------------------------------------------------------------------------------------------------
# REQUIRED PARAMETERS
# You must provide a value for each of these parameters.
# ---------------------------------------------------------------------------------------------------------------------

variable "function_name" {
  description = "Name of the Lambda function to deploy."
}

variable "s3_bucket" {
  description = "The S3 bucket location containing the function's deployment package. This bucket will also be used to store CodePipeline artifacts and CloudTrail logs."
}

variable "s3_key" {
  description = "The S3 key of an object containing the function's deployment package."
}

# ---------------------------------------------------------------------------------------------------------------------
# OPTIONAL PARAMETERS
# These parameters have reasonable defaults.
# ---------------------------------------------------------------------------------------------------------------------

variable "alias_name" {
  default     = "live"
  description = "Name of the alias to the Lambda function used in the CodeDeploy AppSpec."
}

variable "codestar_notifications_detail_type" {
  default     = "BASIC"
  description = "The level of detail to include in the notifications for this resource. Possible values are BASIC and FULL."
  type        = string
}

variable "codestar_notifications_event_type_ids" {
  default     = ["codepipeline-pipeline-pipeline-execution-succeeded", "codepipeline-pipeline-pipeline-execution-failed"]
  description = "A list of event types associated with this notification rule. For list of allowed events see https://docs.aws.amazon.com/dtconsole/latest/userguide/concepts.html#concepts-api."
  type        = list(string)
}

variable "codestar_notifications_target_arn" {
  default     = ""
  description = "ARN of a notification rule target (e.g. a SNS Topic ARN)."
  type        = string
}

variable "deployment_config_name" {
  default     = "CodeDeployDefault.LambdaAllAtOnce"
  description = "The name of the deployment config used in the CodeDeploy deployment group."
}

variable "tags" {
  description = "A mapping of tags to assign to all resources supporting tags."
  default     = {}
}

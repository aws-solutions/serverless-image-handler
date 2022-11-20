// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

export enum CustomResourceActions {
  SEND_ANONYMOUS_METRIC = "sendMetric",
  PUT_CONFIG_FILE = "putConfigFile",
  COPY_S3_ASSETS = "copyS3assets",
  CREATE_UUID = "createUuid",
  CHECK_SOURCE_BUCKETS = "checkSourceBuckets",
  CHECK_SECRETS_MANAGER = "checkSecretsManager",
  CHECK_FALLBACK_IMAGE = "checkFallbackImage",
  CREATE_LOGGING_BUCKET = "createCloudFrontLoggingBucket",
}

export enum CustomResourceRequestTypes {
  CREATE = "Create",
  UPDATE = "Update",
  DELETE = "Delete",
}

export enum StatusTypes {
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
}

export enum ErrorCodes {
  ACCESS_DENIED = "AccessDenied",
  FORBIDDEN = "Forbidden",
}

// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { CloudWatchClient } from "@aws-sdk/client-cloudwatch";
import { SQSClient } from "@aws-sdk/client-sqs";
import { CloudWatchLogsClient } from "@aws-sdk/client-cloudwatch-logs";

export class ClientHelper {
  private sqsClient: SQSClient;
  private cwClient: CloudWatchClient;
  private cwLogsClient: CloudWatchLogsClient;

  constructor() {}

  getSqsClient(): SQSClient {
    if (!this.sqsClient) {
      this.sqsClient = new SQSClient();
    }
    return this.sqsClient;
  }

  getCwClient(): CloudWatchClient {
    if (!this.cwClient) {
      this.cwClient = new CloudWatchClient();
    }
    return this.cwClient;
  }

  getCwLogsClient(): CloudWatchLogsClient {
    if (!this.cwLogsClient) {
      this.cwLogsClient = new CloudWatchLogsClient();
    }
    return this.cwLogsClient;
  }
}

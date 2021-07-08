// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from '@aws-cdk/core';
import { ConstructsStack, ECSImageHandlerStack } from '../lib/constructs-stack';

const app = new cdk.App();
new ConstructsStack(app, 'ConstructsStack');
new ECSImageHandlerStack(app, 'serverless-ecr-image-handler-stack', {
  tags: {
    name: 'serverless-ecr-image-handler',
  },
});
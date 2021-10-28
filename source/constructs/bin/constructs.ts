// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from '@aws-cdk/core';
import { ConstructsStack, ECSImageHandlerStack, LambdaImageHandlerStack } from '../lib/constructs-stack';

const app = new cdk.App();
new ConstructsStack(app, 'ConstructsStack');
const ecsStack = new ECSImageHandlerStack(app, 'serverless-ecs-image-handler-stack', {
  stackName: process.env.STACK_NAME,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEPLOY_REGION,
  },
});

cdk.Tags.of(ecsStack).add('name', 'serverless-ecs-image-handler');

new LambdaImageHandlerStack(app, 'lambda-image-handler-stack', {
  stackName: process.env.STACK_NAME,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEPLOY_REGION,
  },
});
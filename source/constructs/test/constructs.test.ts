// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import '@aws-cdk/assert/jest';
import { SynthUtils } from '@aws-cdk/assert';
import { App } from '@aws-cdk/core';

import { ServerlessImageHandlerStack } from '../lib/serverless-image-stack';

test('Serverless Image Handler Stack Snapshot', () => {
  const app = new App();

  const stack = new ServerlessImageHandlerStack(app, 'TestStack', {
    description: 'Serverless Image Handler Stack',
    solutionId: 'S0ABC',
    solutionName: 'sih',
    solutionVersion: 'v6.0.0',
    solutionDisplayName: 'Serverless Image Handler Test',
    solutionAssetHostingBucketNamePrefix: 'hosting-bucket'
  });

  expect.assertions(1);
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

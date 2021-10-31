// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from '@aws-cdk/core';
import * as Constructs from '../lib/constructs-stack';


test('Serverless Image Handler Stack', () => {
  const app = new cdk.App();
  // WHEN
  const stack = new Constructs.ConstructsStack(app, 'MyTestStack');
  // THEN

  expect(app.synth().getStackArtifact(stack.artifactId).template).toMatchSnapshot();
});

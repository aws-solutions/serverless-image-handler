// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { expect as expectCDK, matchTemplate, MatchStyle } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as Constructs from '../lib/constructs-stack';
import TestTemplate from './serverless-image-handler-test.json';

test('Serverless Image Handler Stack', () => {
  const app = new cdk.App();
  // WHEN
  const stack = new Constructs.ConstructsStack(app, 'MyTestStack');
  // THEN
  expectCDK(stack).to(matchTemplate(TestTemplate, MatchStyle.EXACT));
});

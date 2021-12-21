// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { App } from '@aws-cdk/core';
import { ServerlessImageHandlerStack, ServerlessImageHandlerStackProps } from '../lib/serverless-image-stack';

const getProps = (): ServerlessImageHandlerStackProps => {
  const { SOLUTION_BUCKET_NAME_PLACEHOLDER, SOLUTION_NAME_PLACEHOLDER, SOLUTION_VERSION_PLACEHOLDER } = process.env;

  if (typeof SOLUTION_BUCKET_NAME_PLACEHOLDER !== 'string' || SOLUTION_BUCKET_NAME_PLACEHOLDER.trim() === '') {
    throw new Error('Missing required environment variable: SOLUTION_BUCKET_NAME_PLACEHOLDER');
  }

  if (typeof SOLUTION_NAME_PLACEHOLDER !== 'string' || SOLUTION_NAME_PLACEHOLDER.trim() === '') {
    throw new Error('Missing required environment variable: SOLUTION_NAME_PLACEHOLDER');
  }

  if (typeof SOLUTION_VERSION_PLACEHOLDER !== 'string' || SOLUTION_VERSION_PLACEHOLDER.trim() === '') {
    throw new Error('Missing required environment variable: SOLUTION_VERSION_PLACEHOLDER');
  }

  const solutionId = 'SO0023';
  const solutionDisplayName = 'Serverless Image Handler';
  const solutionVersion = SOLUTION_VERSION_PLACEHOLDER;
  const solutionName = SOLUTION_NAME_PLACEHOLDER;
  const solutionAssetHostingBucketNamePrefix = SOLUTION_BUCKET_NAME_PLACEHOLDER;
  const description = `(${solutionId}) - ${solutionDisplayName}. Version ${solutionVersion}`;

  return {
    description,
    solutionId,
    solutionName,
    solutionDisplayName,
    solutionVersion,
    solutionAssetHostingBucketNamePrefix
  };
};

const app = new App();

// eslint-disable-next-line no-new
new ServerlessImageHandlerStack(app, 'ServerlessImageHandlerStack', getProps());

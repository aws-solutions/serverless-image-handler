// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { LambdaContext } from "../lib";

export const mockAwsEc2 = {
  describeRegions: jest.fn(),
};

jest.mock("@aws-sdk/client-ec2", () => ({
  EC2: jest.fn(() => ({ ...mockAwsEc2 }))
}));

export const mockAwsS3 = {
  headObject: jest.fn(),
  copyObject: jest.fn(),
  getObject: jest.fn(),
  putObject: jest.fn(),
  headBucket: jest.fn(),
  createBucket: jest.fn(),
  putBucketEncryption: jest.fn(),
  putBucketPolicy: jest.fn(),
};

jest.mock("@aws-sdk/client-s3", () => ({
  S3: jest.fn(() => ({ ...mockAwsS3 }))
}));

export const mockAwsSecretManager = {
  getSecretValue: jest.fn(),
};

jest.mock("@aws-sdk/client-secrets-manager", () => ({
  SecretsManager: jest.fn(() => ({ ...mockAwsSecretManager }))
}));

export const mockAxios = {
  put: jest.fn(),
  post: jest.fn(),
};

jest.mock("axios", () => ({
  put: mockAxios.put,
  post: mockAxios.post,
}));

jest.mock("uuid", () => ({ v4: jest.fn(() => "mock-uuid") }));

const mockTimeStamp = new Date();
export const mockISOTimeStamp = mockTimeStamp.toISOString();

jest.mock("moment", () => {
  const originalMoment = jest.requireActual("moment");
  const mockMoment = (date: string | undefined) => originalMoment(mockTimeStamp);
  mockMoment.utc = () => ({
    format: () => mockISOTimeStamp,
  });
  return mockMoment;
});

export const consoleInfoSpy = jest.spyOn(console, "info");
export const consoleErrorSpy = jest.spyOn(console, "error");

export const mockContext: LambdaContext = {
  logStreamName: "mock-stream",
};

// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import S3 from "aws-sdk/clients/s3";
import SecretsManager from "aws-sdk/clients/secretsmanager";

import { ImageRequest } from "../../image-request";
import { StatusCodes } from "../../lib";
import { SecretProvider } from "../../secret-provider";

describe("getAllowedSourceBuckets", () => {
  const s3Client = new S3();
  const secretsManager = new SecretsManager();
  const secretProvider = new SecretProvider(secretsManager);

  it("Should pass if the SOURCE_BUCKETS environment variable is not empty and contains valid inputs", () => {
    // Arrange
    process.env.SOURCE_BUCKETS = "allowedBucket001, allowedBucket002";

    // Act
    const imageRequest = new ImageRequest(s3Client, secretProvider);
    const result = imageRequest.getAllowedSourceBuckets();

    // Assert
    const expectedResult = ["allowedBucket001", "allowedBucket002"];
    expect(result).toEqual(expectedResult);
  });

  it("Should throw an error if the SOURCE_BUCKETS environment variable is empty or does not contain valid values", () => {
    // Arrange
    process.env = {};

    // Act
    const imageRequest = new ImageRequest(s3Client, secretProvider);

    // Assert
    try {
      imageRequest.getAllowedSourceBuckets();
    } catch (error) {
      expect(error).toMatchObject({
        status: StatusCodes.BAD_REQUEST,
        code: "GetAllowedSourceBuckets::NoSourceBuckets",
        message:
          "The SOURCE_BUCKETS variable could not be read. Please check that it is not empty and contains at least one source bucket, or multiple buckets separated by commas. Spaces can be provided between commas and bucket names, these will be automatically parsed out when decoding.",
      });
    }
  });
});

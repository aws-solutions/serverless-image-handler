// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { consoleErrorSpy, consoleInfoSpy, mockAwsS3, mockContext } from "./mock";
import {
  CustomResourceActions,
  CustomResourceRequestTypes,
  ErrorCodes,
  CopyS3AssetsRequestProperties,
  CustomResourceRequest,
  CustomResourceError,
} from "../lib";
import { handler } from "../index";

describe("COPY_S3_ASSETS", () => {
  // Mock event data
  const event: CustomResourceRequest = {
    RequestType: CustomResourceRequestTypes.CREATE,
    ResponseURL: "/cfn-response",
    PhysicalResourceId: "mock-physical-id",
    StackId: "mock-stack-id",
    ServiceToken: "mock-service-token",
    RequestId: "mock-request-id",
    LogicalResourceId: "mock-logical-resource-id",
    ResourceType: "mock-resource-type",
    ResourceProperties: {
      CustomAction: CustomResourceActions.COPY_S3_ASSETS,
      ManifestKey: "manifest.json",
      SourceS3Bucket: "source-bucket",
      SourceS3key: "source-key",
      DestS3Bucket: "destination-bucket",
    },
  };

  const manifest = {
    files: ["index.html", "scripts.js", "style.css", "image.png", "image.jpg", "image.svg", "text.txt"],
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("Should return success to copy S3 assets", async () => {
    mockAwsS3.getObject.mockImplementationOnce(() => ({
      promise() {
        return Promise.resolve({ Body: JSON.stringify(manifest) });
      },
    }));
    mockAwsS3.copyObject.mockImplementation(() => ({
      promise() {
        return Promise.resolve({ CopyObjectResult: "Success" });
      },
    }));

    const result = await handler(event, mockContext);
    const resourceProperties = event.ResourceProperties as CopyS3AssetsRequestProperties;

    expect.assertions(2);

    expect(consoleInfoSpy).toHaveBeenCalledWith(`Source bucket: ${resourceProperties.SourceS3Bucket}`);
    expect(result).toEqual({
      Status: "SUCCESS",
      Data: {
        Message: "Copy assets completed.",
        Manifest: { Files: [...manifest.files] },
      },
    });
  });

  it("Should return failed when getting manifest fails", async () => {
    mockAwsS3.getObject.mockImplementationOnce(() => ({
      promise() {
        return Promise.reject(new CustomResourceError(null, "GetObject failed."));
      },
    }));

    const result = await handler(event, mockContext);

    expect.assertions(2);

    expect(consoleErrorSpy).toHaveBeenCalledWith("Error occurred while getting manifest file.");
    expect(result).toEqual({
      Status: "FAILED",
      Data: {
        Error: {
          Code: "GetManifestFailure",
          Message: "Copy of website assets failed.",
        },
      },
    });
  });

  it("Should return failed when copying assets fails", async () => {
    mockAwsS3.getObject.mockImplementationOnce(() => ({
      promise() {
        return Promise.resolve({ Body: JSON.stringify(manifest) });
      },
    }));
    mockAwsS3.getObject.mockImplementationOnce(() => ({
      promise() {
        return Promise.reject(new CustomResourceError(null, "CopyObject failed."));
      },
    }));

    const result = await handler(event, mockContext);

    expect.assertions(2);

    expect(consoleErrorSpy).toHaveBeenCalledWith("Error occurred while copying assets.");
    expect(result).toEqual({
      Status: "FAILED",
      Data: {
        Error: {
          Code: "CopyAssetsFailure",
          Message: "Copy of website assets failed.",
        },
      },
    });
  });

  it("Should retry and return success IAM policy if not ready so S3 API returns AccessDenied", async () => {
    mockAwsS3.getObject.mockImplementationOnce(() => ({
      promise() {
        return Promise.reject(new CustomResourceError(ErrorCodes.ACCESS_DENIED, null));
      },
    }));
    mockAwsS3.getObject.mockImplementationOnce(() => ({
      promise() {
        return Promise.resolve({ Body: JSON.stringify(manifest) });
      },
    }));
    mockAwsS3.copyObject.mockImplementation(() => ({
      promise() {
        return Promise.resolve({ CopyObjectResult: "Success" });
      },
    }));

    const result = await handler(event, mockContext);

    expect.assertions(1);

    expect(result).toEqual({
      Status: "SUCCESS",
      Data: {
        Message: "Copy assets completed.",
        Manifest: { Files: [...manifest.files] },
      },
    });
  });
});

// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { mockContext } from "./mock";
import { CustomResourceRequestTypes, CustomResourceRequest } from "../lib";
import { handler } from "../index";

describe("Default", () => {
  // Mock event data
  const event: CustomResourceRequest = {
    RequestType: CustomResourceRequestTypes.UPDATE,
    ResponseURL: "/cfn-response",
    PhysicalResourceId: "mock-physical-id",
    StackId: "mock-stack-id",
    ServiceToken: "mock-service-token",
    RequestId: "mock-request-id",
    LogicalResourceId: "mock-logical-resource-id",
    ResourceType: "mock-resource-type",
    ResourceProperties: {
      CustomAction: null,
    },
  };

  it("Should return success for other default custom resource", async () => {
    const result = await handler(event, mockContext);

    expect(result).toEqual({
      Status: "SUCCESS",
      Data: {},
    });
  });
});

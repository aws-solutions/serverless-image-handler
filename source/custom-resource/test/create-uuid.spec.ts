// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { mockContext, mockAxios } from "./mock";
import { CustomResourceActions, CustomResourceRequestTypes, CustomResourceRequest } from "../lib";
import { handler } from "../index";

describe("CREATE_UUID", () => {
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
      CustomAction: CustomResourceActions.CREATE_UUID,
    },
  };

  it("Should create an UUID", async () => {
    mockAxios.put.mockResolvedValue({ status: 200 });

    const response = await handler(event, mockContext);

    expect.assertions(1);

    expect(response).toEqual({
      Status: "SUCCESS",
      Data: { UUID: "mock-uuid" },
    });
  });
});

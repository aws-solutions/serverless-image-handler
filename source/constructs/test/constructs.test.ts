// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Template } from "aws-cdk-lib/assertions";
import { App } from "aws-cdk-lib";

import { ServerlessImageHandlerStack } from "../lib/serverless-image-stack";

test("Serverless Image Handler Stack Snapshot", () => {
  const app = new App();

  const stack = new ServerlessImageHandlerStack(app, "TestStack", {
    solutionId: "S0ABC",
    solutionName: "sih",
    solutionVersion: "v6.1.0",
  });

  const template = Template.fromStack(stack);

  expect.assertions(1);
  expect(template.toJSON()).toMatchSnapshot();
});

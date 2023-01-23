// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { App, DefaultStackSynthesizer } from "aws-cdk-lib";
import { ServerlessImageHandlerStack } from "../lib/serverless-image-stack";

const app = new App();
// eslint-disable-next-line no-new
new ServerlessImageHandlerStack(app, "ServerlessImageHandlerStack", {
  synthesizer: new DefaultStackSynthesizer({
    generateBootstrapVersionRule: false,
  }),
  solutionId: app.node.tryGetContext("solutionId"),
  solutionVersion: app.node.tryGetContext("solutionVersion"),
  solutionName: app.node.tryGetContext("solutionName"),
});

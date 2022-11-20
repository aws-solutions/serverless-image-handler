// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { CfnFunction } from "aws-cdk-lib/aws-lambda";
import { CfnCondition, CfnResource, IAspect } from "aws-cdk-lib";
import { IConstruct } from "constructs";

import { addCfnSuppressRules } from "./utils";

/**
 * CDK Aspect to add common CFN Nag rule suppressions to Lambda functions.
 */
export class SuppressLambdaFunctionCfnRulesAspect implements IAspect {
  /**
   * Implements IAspect.visit to suppress rules specific to a Lambda function.
   * @param node Construct node to visit
   */
  visit(node: IConstruct): void {
    const resource = node as CfnResource;
    if (resource instanceof CfnFunction) {
      const rules = [
        {
          id: "W58",
          reason: "The function does have permission to write CloudWatch Logs.",
        },
        {
          id: "W89",
          reason: "The Lambda function does not require any VPC connection at all.",
        },
        {
          id: "W92",
          reason: "The Lambda function does not require ReservedConcurrentExecutions.",
        },
      ];

      addCfnSuppressRules(resource, rules);
    }
  }
}

/**
 * CDK Aspect implementation to set up conditions to the entire Construct resources.
 */
export class ConditionAspect implements IAspect {
  private readonly condition: CfnCondition;

  constructor(condition: CfnCondition) {
    this.condition = condition;
  }

  /**
   * Implements IAspect.visit to set the condition to whole resources in Construct.
   * @param node Construct node to visit
   */
  visit(node: IConstruct): void {
    const resource = node as CfnResource;
    if (resource.cfnOptions) {
      resource.cfnOptions.condition = this.condition;
    }
  }
}

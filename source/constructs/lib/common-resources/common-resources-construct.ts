// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Policy, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { IBucket } from "aws-cdk-lib/aws-s3";
import { ArnFormat, Aws, CfnCondition, Fn, Stack, Tags } from "aws-cdk-lib";
import { Construct } from "constructs";
import { addCfnCondition } from "../../utils/utils";
import { SolutionConstructProps } from "../types";
import { CustomResourcesConstruct } from "./custom-resources/custom-resource-construct";
import * as appreg from "@aws-cdk/aws-servicecatalogappregistry-alpha";

export interface CommonResourcesProps extends SolutionConstructProps {
  readonly solutionId: string;
  readonly solutionVersion: string;
  readonly solutionName: string;
}

export interface Conditions {
  readonly deployUICondition: CfnCondition;
  readonly enableSignatureCondition: CfnCondition;
  readonly enableDefaultFallbackImageCondition: CfnCondition;
  readonly enableCorsCondition: CfnCondition;
}

export interface AppRegistryApplicationProps {
  readonly description: string;
  readonly solutionId: string;
  readonly applicationName: string;
  readonly solutionVersion: string;
}

/**
 * Construct that creates Common Resources for the solution.
 */
export class CommonResources extends Construct {
  public readonly conditions: Conditions;
  public readonly logsBucket: IBucket;
  public readonly secretsManagerPolicy: Policy;
  public readonly customResources: CustomResourcesConstruct;

  constructor(scope: Construct, id: string, props: CommonResourcesProps) {
    super(scope, id);

    this.conditions = {
      deployUICondition: new CfnCondition(this, "DeployDemoUICondition", {
        expression: Fn.conditionEquals(props.deployUI, "Yes"),
      }),
      enableSignatureCondition: new CfnCondition(this, "EnableSignatureCondition", {
        expression: Fn.conditionEquals(props.enableSignature, "Yes"),
      }),
      enableDefaultFallbackImageCondition: new CfnCondition(this, "EnableDefaultFallbackImageCondition", {
        expression: Fn.conditionEquals(props.enableDefaultFallbackImage, "Yes"),
      }),
      enableCorsCondition: new CfnCondition(this, "EnableCorsCondition", {
        expression: Fn.conditionEquals(props.corsEnabled, "Yes"),
      }),
    };

    this.secretsManagerPolicy = new Policy(this, "SecretsManagerPolicy", {
      statements: [
        new PolicyStatement({
          actions: ["secretsmanager:GetSecretValue"],
          resources: [
            Stack.of(this).formatArn({
              partition: Aws.PARTITION,
              service: "secretsmanager",
              region: Aws.REGION,
              account: Aws.ACCOUNT_ID,
              resource: "secret",
              resourceName: `${props.secretsManager}*`,
              arnFormat: ArnFormat.COLON_RESOURCE_NAME,
            }),
          ],
        }),
      ],
    });
    addCfnCondition(this.secretsManagerPolicy, this.conditions.enableSignatureCondition);

    this.customResources = new CustomResourcesConstruct(this, "CustomResources", {
      conditions: this.conditions,
      secretsManagerPolicy: this.secretsManagerPolicy,
      ...props,
    });

    this.logsBucket = this.customResources.createLogBucket();
  }

  public appRegistryApplication(props: AppRegistryApplicationProps) {
    const stack = Stack.of(this);
    const applicationType = "AWS-Solutions";

    const application = new appreg.Application(stack, "AppRegistry", {
      applicationName: Fn.join("-", ["AppRegistry", Aws.STACK_NAME, Aws.REGION, Aws.ACCOUNT_ID]),
      description: `Service Catalog application to track and manage all your resources for the solution ${props.applicationName}`,
    });
    application.associateStack(stack);

    Tags.of(application).add("Solutions:SolutionID", props.solutionId);
    Tags.of(application).add("Solutions:SolutionName", props.applicationName);
    Tags.of(application).add("Solutions:SolutionVersion", props.solutionVersion);
    Tags.of(application).add("Solutions:ApplicationType", applicationType);

    const attributeGroup = new appreg.AttributeGroup(stack, "DefaultApplicationAttributes", {
      attributeGroupName: `AppRegistry-${Aws.STACK_NAME}`,
      description: "Attribute group for solution information",
      attributes: {
        applicationType,
        version: props.solutionVersion,
        solutionID: props.solutionId,
        solutionName: props.applicationName,
      },
    });
    application.associateAttributeGroup(attributeGroup);
  }
}

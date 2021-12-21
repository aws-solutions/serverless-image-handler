// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Policy, PolicyStatement } from '@aws-cdk/aws-iam';
import { IBucket } from '@aws-cdk/aws-s3';
import { ArnFormat, Aws, CfnCondition, Construct, Fn, Stack } from '@aws-cdk/core';

import { addCfnCondition } from '../../utils/utils';
import { SolutionConstructProps } from '../types';
import { CustomResourcesConstruct } from './custom-resources/custom-resource-construct';

export interface CommonResourcesProps extends SolutionConstructProps {
  readonly solutionId: string;
  readonly solutionVersion: string;
  readonly solutionDisplayName: string;
  readonly sourceCodeBucketName: string;
  readonly sourceCodeKeyPrefix: string;
}

export interface Conditions {
  readonly deployUICondition: CfnCondition;
  readonly enableSignatureCondition: CfnCondition;
  readonly enableDefaultFallbackImageCondition: CfnCondition;
  readonly enableCorsCondition: CfnCondition;
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
      deployUICondition: new CfnCondition(this, 'DeployDemoUICondition', {
        expression: Fn.conditionEquals(props.deployUI, 'Yes')
      }),
      enableSignatureCondition: new CfnCondition(this, 'EnableSignatureCondition', {
        expression: Fn.conditionEquals(props.enableSignature, 'Yes')
      }),
      enableDefaultFallbackImageCondition: new CfnCondition(this, 'EnableDefaultFallbackImageCondition', {
        expression: Fn.conditionEquals(props.enableDefaultFallbackImage, 'Yes')
      }),
      enableCorsCondition: new CfnCondition(this, 'EnableCorsCondition', {
        expression: Fn.conditionEquals(props.corsEnabled, 'Yes')
      })
    };

    this.secretsManagerPolicy = new Policy(this, 'SecretsManagerPolicy', {
      statements: [
        new PolicyStatement({
          actions: ['secretsmanager:GetSecretValue'],
          resources: [
            Stack.of(this).formatArn({
              partition: Aws.PARTITION,
              service: 'secretsmanager',
              region: Aws.REGION,
              account: Aws.ACCOUNT_ID,
              resource: 'secret',
              resourceName: `${props.secretsManager}*`,
              arnFormat: ArnFormat.COLON_RESOURCE_NAME
            })
          ]
        })
      ]
    });
    addCfnCondition(this.secretsManagerPolicy, this.conditions.enableSignatureCondition);

    this.customResources = new CustomResourcesConstruct(this, 'CustomResources', {
      conditions: this.conditions,
      secretsManagerPolicy: this.secretsManagerPolicy,
      ...props
    });

    this.logsBucket = this.customResources.createLogBucket();
  }
}

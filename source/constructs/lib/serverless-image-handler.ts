// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Construct, CfnParameter } from "@aws-cdk/core";
import * as cdkLambda from '@aws-cdk/aws-lambda';
import * as cdkS3 from '@aws-cdk/aws-s3';
import * as cdkIam from '@aws-cdk/aws-iam';
import * as cdk from '@aws-cdk/core';
import * as cdkCloudFront from '@aws-cdk/aws-cloudfront';
import * as cdkApiGateway from '@aws-cdk/aws-apigateway';
import * as cdkLogs from '@aws-cdk/aws-logs';
import { CloudFrontToApiGatewayToLambda } from '@aws-solutions-constructs/aws-cloudfront-apigateway-lambda';
import { CloudFrontToS3 } from '@aws-solutions-constructs/aws-cloudfront-s3';
import apiBody from './api.json';

const { BUCKET_NAME, SOLUTION_NAME, VERSION } = process.env;

/**
 * Serverless Image Handler props interface
 * These props are AWS CloudFormation parameters.
 */
export interface ServerlessImageHandlerProps {
  readonly corsEnabledParameter: CfnParameter;
  readonly corsOriginParameter: CfnParameter;
  readonly sourceBucketsParameter: CfnParameter;
  readonly deployDemoUiParameter: CfnParameter;
  readonly logRetentionPeriodParameter: CfnParameter;
  readonly autoWebPParameter: CfnParameter;
}

/**
 * Serverless Image Handler custom resource config interface
 */
interface CustomResourceConfig {
  readonly properties?: { path: string, value: any }[];
  readonly condition?: cdk.CfnCondition;
  readonly dependencies?: cdk.CfnResource[];
}

/**
 * cfn-nag suppression rule interface
 */
interface CfnNagSuppressRule {
  readonly id: string;
  readonly reason: string;
}

/**
 * Serverless Image Handler Construct using AWS Solutions Constructs patterns and AWS CDK
 * @version 5.0.0
 */
export class ServerlessImageHandler extends Construct {
  constructor(scope: Construct, id: string, props: ServerlessImageHandlerProps) {
    super(scope, id);

    try {
      // CFN Conditions
      const deployDemoUiCondition = new cdk.CfnCondition(this, 'DeployDemoUICondition', {
        expression: cdk.Fn.conditionEquals(props.deployDemoUiParameter.valueAsString, 'Yes')
      });
      deployDemoUiCondition.overrideLogicalId('DeployDemoUICondition');

      const enableCorsCondition = new cdk.CfnCondition(this, 'EnableCorsCondition', {
        expression: cdk.Fn.conditionEquals(props.corsEnabledParameter.valueAsString, 'Yes')
      });
      enableCorsCondition.overrideLogicalId('EnableCorsCondition');

      // ImageHandlerFunctionRole
      const imageHandlerFunctionRole = new cdkIam.Role(this, 'ImageHandlerFunctionRole', {
        assumedBy: new cdkIam.ServicePrincipal('lambda.amazonaws.com'),
        path: '/',
        roleName: `${cdk.Aws.STACK_NAME}ImageHandlerFunctionRole-${cdk.Aws.REGION}`
      });
      const cfnImageHandlerFunctionRole = imageHandlerFunctionRole.node.defaultChild as cdkIam.CfnRole;
      this.addCfnNagSuppressRules(cfnImageHandlerFunctionRole, [
        {
          id: 'W28',
          reason: 'Resource name validated and found to pose no risk to updates that require replacement of this resource.'
        }
      ]);
      cfnImageHandlerFunctionRole.overrideLogicalId('ImageHandlerFunctionRole');

      // ImageHandlerPolicy
      const imageHandlerPolicy = new cdkIam.Policy(this, 'ImageHandlerPolicy', {
        policyName: `${cdk.Aws.STACK_NAME}ImageHandlerPolicy`,
        statements: [
          new cdkIam.PolicyStatement({
            actions: [
              'logs:CreateLogStream',
              'logs:CreateLogGroup',
              'logs:PutLogEvents'
            ],
            resources: [
              `arn:${cdk.Aws.PARTITION}:logs:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:log-group:/aws/lambda/*`
            ]
          }),
          new cdkIam.PolicyStatement({
            actions: [
              's3:GetObject',
              's3:PutObject',
              's3:ListBucket'
            ],
            resources: [
              `arn:${cdk.Aws.PARTITION}:s3:::*`
            ]
          }),
          new cdkIam.PolicyStatement({
            actions: [
              'rekognition:DetectFaces'
            ],
            resources: [
              '*'
            ]
          })
        ]
      });
      imageHandlerPolicy.attachToRole(imageHandlerFunctionRole);
      const cfnImageHandlerPolicy = imageHandlerPolicy.node.defaultChild as cdkIam.CfnPolicy;
      this.addCfnNagSuppressRules(cfnImageHandlerPolicy, [
        {
          id: 'W12',
          reason: 'rekognition:DetectFaces requires \'*\' resources.'
        }
      ]);
      cfnImageHandlerPolicy.overrideLogicalId('ImageHandlerPolicy');

      // ImageHandlerFunction
      const imageHandlerFunction = new cdkLambda.Function(this, 'ImageHanlderFunction', {
        description: 'Serverless Image Handler - Function for performing image edits and manipulations.',
        code: new cdkLambda.S3Code(
          cdkS3.Bucket.fromBucketArn(this, 'ImageHandlerLambdaSource', `arn:${cdk.Aws.PARTITION}:s3:::${BUCKET_NAME}-${cdk.Aws.REGION}`),
          `${SOLUTION_NAME}/${VERSION}/image-handler.zip`
        ),
        handler: 'index.handler',
        runtime: cdkLambda.Runtime.NODEJS_12_X,
        timeout: cdk.Duration.seconds(30),
        memorySize: 256,
        role: imageHandlerFunctionRole,
        environment: {
          AUTO_WEBP: props.autoWebPParameter.valueAsString,
          CORS_ENABLED: props.corsEnabledParameter.valueAsString,
          CORS_ORIGIN: props.corsOriginParameter.valueAsString,
          SOURCE_BUCKETS: props.sourceBucketsParameter.valueAsString,
          REWRITE_MATCH_PATTERN: '',
          REWRITE_SUBSTITUTION: ''
        }
      });
      const cfnImageHandlerFunction = imageHandlerFunction.node.defaultChild as cdkLambda.CfnFunction;
      this.addCfnNagSuppressRules(cfnImageHandlerFunction, [
        {
          id: 'W58',
          reason: 'False alarm: The Lambda function does have the permission to write CloudWatch Logs.'
        }
      ]);
      cfnImageHandlerFunction.overrideLogicalId('ImageHandlerFunction');

      // ImageHandlerLogGroup
      const lambdaFunctionLogs = new cdkLogs.LogGroup(this, 'ImageHandlerLogGroup', {
        logGroupName: `/aws/lambda/${imageHandlerFunction.functionName}`
      });
      const cfnLambdaFunctionLogs = lambdaFunctionLogs.node.defaultChild as cdkLogs.CfnLogGroup;
      cfnLambdaFunctionLogs.retentionInDays = props.logRetentionPeriodParameter.valueAsNumber;
      cfnLambdaFunctionLogs.overrideLogicalId('ImageHandlerLogGroup');

      // CloudFrontToApiGatewayToLambda pattern
      const cloudFrontApiGatewayLambda = new CloudFrontToApiGatewayToLambda(this, 'CloudFrontApiGatewayLambda', {
        existingLambdaObj: imageHandlerFunction,
        insertHttpSecurityHeaders: false
      });
      const { apiGatewayLogGroup, apiGateway, cloudFrontWebDistribution } = cloudFrontApiGatewayLambda;

      // ApiLogs
      const cfnApiGatewayLogGroup = apiGatewayLogGroup.node.defaultChild as cdkLogs.CfnLogGroup;
      cfnApiGatewayLogGroup.overrideLogicalId('ApiLogs');

      // ImageHandlerApi
      this.removeChildren(apiGateway, [ 'Endpoint', 'UsagePlan', 'Deployment', 'Default', 'DeploymentStage.prod' ]);
      const cfnApiGateway = apiGateway.node.defaultChild as cdkApiGateway.CfnRestApi;
      cfnApiGateway.name = 'ServerlessImageHandler';
      cfnApiGateway.body = apiBody;
      cfnApiGateway.overrideLogicalId('ImageHandlerApi');

      // ImageHandlerPermission
      imageHandlerFunction.addPermission('ImageHandlerPermission', {
        action: 'lambda:InvokeFunction',
        sourceArn: `arn:${cdk.Aws.PARTITION}:execute-api:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:${apiGateway.restApiId}/*/*/*`,
        principal: new cdkIam.ServicePrincipal('apigateway.amazonaws.com')
      });
      (imageHandlerFunction.node.findChild('ImageHandlerPermission') as cdkLambda.CfnPermission).overrideLogicalId('ImageHandlerPermission');

      // ApiLoggingRole
      const cfnApiGatewayLogRole = cloudFrontApiGatewayLambda.apiGatewayCloudWatchRole.node.defaultChild as cdkIam.CfnRole;
      cfnApiGatewayLogRole.overrideLogicalId('ApiLoggingRole');

      // ApiAccountConfig
      const cfnApiGatewayAccount = cloudFrontApiGatewayLambda.node.findChild('LambdaRestApiAccount') as cdkApiGateway.CfnAccount;
      cfnApiGatewayAccount.overrideLogicalId('ApiAccountConfig');

      // ImageHandlerApiDeployment
      const cfnApiGatewayDeployment = new cdkApiGateway.CfnDeployment(this, 'ImageHanlderApiDeployment', {
        restApiId: apiGateway.restApiId,
        stageName: 'image',
        stageDescription: {
          accessLogSetting: {
            destinationArn: cfnApiGatewayLogGroup.attrArn,
            format: '$context.identity.sourceIp $context.identity.caller $context.identity.user [$context.requestTime] "$context.httpMethod $context.resourcePath $context.protocol" $context.status $context.responseLength $context.requestId'
          }
        }
      });
      this.addCfnNagSuppressRules(cfnApiGatewayDeployment, [
        {
          id: 'W68',
          reason: 'The solution does not require the usage plan.'
        }
      ]);
      this.addDependencies(cfnApiGatewayDeployment, [ cfnApiGatewayAccount ]);
      cfnApiGatewayDeployment.overrideLogicalId('ImageHandlerApiDeployment');

      // Logs
      const cloudFrontToApiGateway = cloudFrontApiGatewayLambda.node.findChild('CloudFrontToApiGateway');
      const accessLogBucket = cloudFrontToApiGateway.node.findChild('CloudfrontLoggingBucket') as cdkS3.Bucket;
      const cfnAccessLogBucket = accessLogBucket.node.defaultChild as cdkS3.CfnBucket;
      this.addCfnNagSuppressRules(cfnAccessLogBucket, [
        {
          "id": "W35",
          "reason": "Used to store access logs for other buckets"
        }
      ]);
      cfnAccessLogBucket.overrideLogicalId('Logs');

      // LogsBucketPolicy
      const accessLogBucketPolicy = accessLogBucket.node.findChild('Policy') as cdkS3.BucketPolicy;
      (accessLogBucketPolicy.node.defaultChild as cdkS3.CfnBucketPolicy).overrideLogicalId('LogsBucketPolicy');

      // ImageHandlerDistribution
      const cfnCloudFrontDistribution = cloudFrontWebDistribution.node.defaultChild as cdkCloudFront.CfnDistribution;
      cfnCloudFrontDistribution.distributionConfig = {
        origins: [{
          domainName: `${apiGateway.restApiId}.execute-api.${cdk.Aws.REGION}.amazonaws.com`,
          id: apiGateway.restApiId,
          originPath: '/image',
          customOriginConfig: {
            httpsPort: 443,
            originProtocolPolicy: 'https-only',
            originSslProtocols: [ 'TLSv1.1', 'TLSv1.2' ]
          }
        }],
        enabled: true,
        httpVersion: 'http2',
        comment: 'Image handler distribution',
        defaultCacheBehavior: {
          allowedMethods: [ 'GET', 'HEAD' ],
          targetOriginId: apiGateway.restApiId,
          forwardedValues: {
            queryString: false,
            headers: [ 'Origin', 'Accept' ],
            cookies: { forward: 'none' }
          },
          viewerProtocolPolicy: 'https-only'
        },
        customErrorResponses: [
          { errorCode: 500, errorCachingMinTtl: 10 },
          { errorCode: 501, errorCachingMinTtl: 10 },
          { errorCode: 502, errorCachingMinTtl: 10 },
          { errorCode: 503, errorCachingMinTtl: 10 },
          { errorCode: 504, errorCachingMinTtl: 10 }
        ],
        priceClass: 'PriceClass_All',
        logging: {
          includeCookies: false,
          bucket: accessLogBucket.bucketDomainName,
          prefix: 'image-handler-cf-logs/'
        }
      };
      cfnCloudFrontDistribution.overrideLogicalId('ImageHandlerDistribution');

      // CloudFrontToS3 pattern
      const cloudFrontToS3 = new CloudFrontToS3(this, 'CloudFrontToS3', {
        bucketProps: {
          versioned: false,
          websiteIndexDocument: 'index.html',
          websiteErrorDocument: 'index.html',
          serverAccessLogsBucket: undefined,
          accessControl: cdkS3.BucketAccessControl.PRIVATE
        },
        insertHttpSecurityHeaders: false
      });
      this.removeChildren(cloudFrontToS3, [ 'S3LoggingBucket', 'CloudfrontLoggingBucket' ]);

      // DemoBucket
      const demoBucket = cloudFrontToS3.s3Bucket as cdkS3.Bucket;
      const cfnDemoBucket = demoBucket.node.defaultChild as cdkS3.CfnBucket;
      cfnDemoBucket.cfnOptions.condition = deployDemoUiCondition;
      this.addCfnNagSuppressRules(cfnDemoBucket, [
        {
          id: 'W35',
          reason: 'This S3 bucket does not require access logging. API calls and image operations are logged to CloudWatch with custom reporting.'
        }
      ])
      cfnDemoBucket.overrideLogicalId('DemoBucket');

      // DemoOriginAccessIdentity
      const cfnDemoOriginAccessIdentity = cloudFrontToS3.node.findChild('CloudFrontOriginAccessIdentity') as cdkCloudFront.CfnCloudFrontOriginAccessIdentity;
      cfnDemoOriginAccessIdentity.cloudFrontOriginAccessIdentityConfig = {
        comment: `access-identity-${demoBucket.bucketName}`
      };
      cfnDemoOriginAccessIdentity.cfnOptions.condition = deployDemoUiCondition;
      cfnDemoOriginAccessIdentity.overrideLogicalId('DemoOriginAccessIdentity');

      // DemoBucketPolicy
      const demoBucketPolicy = demoBucket.node.findChild('Policy');
      const cfnDemoBucketPolicy = demoBucketPolicy.node.defaultChild as cdkS3.CfnBucketPolicy;
      cfnDemoBucketPolicy.policyDocument = {
        Statement: [
          {
            Action: [ 's3:GetObject' ],
            Effect: 'Allow',
            Resource: `${demoBucket.bucketArn}/*`,
            Principal: {
              CanonicalUser: cfnDemoOriginAccessIdentity.attrS3CanonicalUserId
            }
          }
        ]
      };
      cfnDemoBucketPolicy.cfnOptions.condition = deployDemoUiCondition;
      cfnDemoBucketPolicy.cfnOptions.metadata = {};
      cfnDemoBucketPolicy.overrideLogicalId('DemoBucketPolicy');

      // DemoDistribution
      const demoDistribution = cloudFrontToS3.cloudFrontWebDistribution;
      const cfnDemoDistribution = demoDistribution.node.defaultChild as cdkCloudFront.CfnDistribution;
      cfnDemoDistribution.distributionConfig = {
        comment: 'Website distribution for solution',
        origins: [{
          id: 'S3-solution-website',
          domainName: demoBucket.bucketRegionalDomainName,
          s3OriginConfig: {
            originAccessIdentity: `origin-access-identity/cloudfront/${cfnDemoOriginAccessIdentity.ref}`
          }
        }],
        defaultCacheBehavior: {
          targetOriginId: 'S3-solution-website',
          allowedMethods: [ 'GET', 'HEAD' ],
          cachedMethods: [ 'GET', 'HEAD' ],
          forwardedValues: {
            queryString: false
          },
          viewerProtocolPolicy: 'redirect-to-https'
        },
        ipv6Enabled: true,
        viewerCertificate: {
          cloudFrontDefaultCertificate: true
        },
        enabled: true,
        httpVersion: 'http2',
        logging: {
          includeCookies: false,
          bucket: accessLogBucket.bucketDomainName,
          prefix: 'demo-cf-logs/'
        }
      };
      cfnDemoDistribution.cfnOptions.condition = deployDemoUiCondition;
      cfnDemoDistribution.overrideLogicalId('DemoDistribution');

      // CustomResourceRole
      const customResourceRole = new cdkIam.Role(this, 'CustomResourceRole', {
        assumedBy: new cdkIam.ServicePrincipal('lambda.amazonaws.com'),
        path: '/',
        roleName: `${cdk.Aws.STACK_NAME}CustomResourceRole-${cdk.Aws.REGION}`
      });
      const cfnCustomResourceRole = customResourceRole.node.defaultChild as cdkIam.CfnRole;
      this.addCfnNagSuppressRules(cfnCustomResourceRole, [
        {
          id: 'W28',
          reason: 'Resource name validated and found to pose no risk to updates that require replacement of this resource.'
        }
      ]);
      cfnCustomResourceRole.overrideLogicalId('CustomResourceRole');

      // CustomResourcePolicy
      const customResourcePolicy = new cdkIam.Policy(this, 'CustomResourcePolicy', {
        policyName: `${cdk.Aws.STACK_NAME}CustomResourcePolicy`,
        statements: [
          new cdkIam.PolicyStatement({
            actions: [
              'logs:CreateLogStream',
              'logs:CreateLogGroup',
              'logs:PutLogEvents'
            ],
            resources: [
              `arn:${cdk.Aws.PARTITION}:logs:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:log-group:/aws/lambda/*`
            ]
          }),
          new cdkIam.PolicyStatement({
            actions: [
              's3:GetObject',
              's3:PutObject',
              's3:ListBucket'
            ],
            resources: [
              `arn:${cdk.Aws.PARTITION}:s3:::*`
            ]
          })
        ]
      });
      customResourcePolicy.attachToRole(customResourceRole);
      const cfnCustomResourcePolicy = customResourcePolicy.node.defaultChild as cdkIam.CfnPolicy;
      cfnCustomResourcePolicy.overrideLogicalId('CustomResourcePolicy');

      // CustomResourceFunction
      const customResourceFunction = new cdkLambda.Function(this, 'CustomResourceFunction', {
        description: 'Serverless Image Handler - Custom resource',
        code: new cdkLambda.S3Code(
          cdkS3.Bucket.fromBucketArn(this, 'CustomResourceLambdaSource', `arn:${cdk.Aws.PARTITION}:s3:::${BUCKET_NAME}-${cdk.Aws.REGION}`),
          `${SOLUTION_NAME}/${VERSION}/custom-resource.zip`
        ),
        handler: 'index.handler',
        runtime: cdkLambda.Runtime.NODEJS_12_X,
        timeout: cdk.Duration.seconds(30),
        memorySize: 128,
        role: customResourceRole
      });
      const cfnCustomResourceFuction = customResourceFunction.node.defaultChild as cdkLambda.CfnFunction;
      this.addCfnNagSuppressRules(cfnCustomResourceFuction, [
        {
          id: 'W58',
          reason: 'False alarm: The Lambda function does have the permission to write CloudWatch Logs.'
        }
      ]);
      cfnCustomResourceFuction.overrideLogicalId('CustomResourceFunction');

      // CustomResourceLogGroup
      const customResourceLogGroup = new cdkLogs.LogGroup(this, 'CustomResourceLogGroup', {
        logGroupName: `/aws/lambda/${customResourceFunction.functionName}`
      });
      const cfnCustomResourceLogGroup = customResourceLogGroup.node.defaultChild as cdkLogs.CfnLogGroup;
      cfnCustomResourceLogGroup.retentionInDays = props.logRetentionPeriodParameter.valueAsNumber;
      cfnCustomResourceLogGroup.overrideLogicalId('CustomResourceLogGroup');

      // CustomResourceCopyS3
      this.createCustomResource('CustomResourceCopyS3', customResourceFunction, {
        properties: [
          { path: 'Region', value: cdk.Aws.REGION },
          { path: 'manifestKey', value: `${SOLUTION_NAME}/${VERSION}/demo-ui-manifest.json` },
          { path: 'sourceS3Bucket', value: `${BUCKET_NAME}-${cdk.Aws.REGION}` },
          { path: 'sourceS3key', value: `${SOLUTION_NAME}/${VERSION}/demo-ui` },
          { path: 'destS3Bucket', value: demoBucket.bucketName },
          { path: 'version', value: VERSION },
          { path: 'customAction', value: 'copyS3assets' },
        ],
        condition: deployDemoUiCondition,
        dependencies: [ cfnCustomResourceRole, cfnCustomResourcePolicy ]
      });

      // CustomResourceConfig
      this.createCustomResource('CustomResourceConfig', customResourceFunction, {
        properties: [
          { path: 'Region', value: cdk.Aws.REGION },
          { path: 'configItem', value: { apiEndpoint: `https://${cloudFrontWebDistribution.domainName}` } },
          { path: 'destS3Bucket', value: demoBucket.bucketName },
          { path: 'destS3key', value: 'demo-ui-config.js' },
          { path: 'customAction', value: 'putConfigFile' },
        ],
        condition: deployDemoUiCondition,
        dependencies: [ cfnCustomResourceRole, cfnCustomResourcePolicy ]
      });

      // CustomResourceUuid
      const customResourceUuid = this.createCustomResource('CustomResourceUuid', customResourceFunction, {
        properties: [
          { path: 'Region', value: cdk.Aws.REGION },
          { path: 'customAction', value: 'createUuid' }
        ],
        dependencies: [ cfnCustomResourceRole, cfnCustomResourcePolicy ]
      });

      // CustomResourceAnonymousMetric
      this.createCustomResource('CustomResourceAnonymousMetric', customResourceFunction, {
        properties: [
          { path: 'Region', value: cdk.Aws.REGION },
          { path: 'solutionId', value: 'SO0023' },
          { path: 'UUID', value: cdk.Fn.getAtt(customResourceUuid.logicalId, 'UUID').toString() },
          { path: 'version', value: VERSION },
          { path: 'anonymousData', value: cdk.Fn.findInMap('Send', 'AnonymousUsage', 'Data') },
          { path: 'customAction', value: 'sendMetric' }
        ],
        dependencies: [ cfnCustomResourceRole, cfnCustomResourcePolicy ]
      });

      // CustomResourceCheckSourceBuckets
      this.createCustomResource('CustomResourceCheckSourceBuckets', customResourceFunction, {
        properties: [
          { path: 'Region', value: cdk.Aws.REGION },
          { path: 'sourceBuckets', value: props.sourceBucketsParameter.valueAsString },
          { path: 'customAction', value: 'checkSourceBuckets' },
        ],
        dependencies: [ cfnCustomResourceRole, cfnCustomResourcePolicy ]
      });
    } catch (error) {
      console.error(error);
    }
  }

  /**
   * Adds cfn-nag suppression rules to the AWS CloudFormation resource metadata.
   * @param {cdk.CfnResource} resource Resource to add cfn-nag suppression rules
   * @param {CfnNagSuppressRule[]} rules Rules to suppress
   */
  addCfnNagSuppressRules(resource: cdk.CfnResource, rules: CfnNagSuppressRule[]) {
    resource.addMetadata('cfn_nag', {
      rules_to_suppress: rules
    });
  }

  /**
   * Adds dependencies to the AWS CloudFormation resource.
   * @param {cdk.CfnResource} resource Resource to add AWS CloudFormation dependencies
   * @param {cdk.CfnResource[]} dependencies Dependencies to be added to the AWS CloudFormation resource
   */
  addDependencies(resource: cdk.CfnResource, dependencies: cdk.CfnResource[]) {
    for (let dependency of dependencies) {
      resource.addDependsOn(dependency);
    }
  }

  /**
   * Removes AWS CDK created children from the AWS CloudFormation resource.
   * @param {cdk.IConstruct} resource Resource to delete children
   * @param {string[]} children The list of children to delete from the resource
   */
  removeChildren(resource: cdk.IConstruct, children: string[]) {
    for (let child of children) {
      resource.node.tryRemoveChild(child);
    }
  }

  /**
   * Removes all dependent children of the resource.
   * @param {cdk.IConstruct} resource Resource to delete all dependent children
   */
  removeAllChildren(resource: cdk.IConstruct) {
    let children = resource.node.children;
    for (let child of children) {
      this.removeAllChildren(child);
      resource.node.tryRemoveChild(child.node.id);
    }
  }

  /**
   * Creates custom resource to the AWS CloudFormation template.
   * @param {string} id Custom resource ID
   * @param {cdkLambda.Function} customResourceFunction Custom resource Lambda function
   * @param {CustomResourceConfig} config Custom resource configuration
   * @return {cdk.CfnCustomResource}
   */
  createCustomResource(id: string, customResourceFunction: cdkLambda.Function, config?: CustomResourceConfig): cdk.CfnCustomResource {
    const customResource = new cdk.CfnCustomResource(this, id, {
      serviceToken: customResourceFunction.functionArn
    });
    customResource.addOverride('Type', 'Custom::CustomResource');
    customResource.overrideLogicalId(id);

    if (config) {
      const { properties, condition, dependencies } = config;

      if (properties) {
        for (let property of properties) {
          customResource.addPropertyOverride(property.path, property.value);
        }
      }

      if (dependencies) {
        this.addDependencies(customResource, dependencies);
      }

      customResource.cfnOptions.condition = condition;
    }

    return customResource;
  }
}
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as path from "path";
import { LambdaRestApiProps, RestApi } from "aws-cdk-lib/aws-apigateway";
import {
  AllowedMethods,
  CfnCachePolicy,
  CfnOriginRequestPolicy,
  DistributionProps,
  ICachePolicy,
  IOrigin,
  IOriginRequestPolicy,
  OriginSslPolicy,
  PriceClass,
  ViewerProtocolPolicy,
} from "aws-cdk-lib/aws-cloudfront";
import { HttpOrigin } from "aws-cdk-lib/aws-cloudfront-origins";
import { Policy, PolicyStatement, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import { IBucket } from "aws-cdk-lib/aws-s3";
import { ArnFormat, Aws, Duration, Lazy, Resource, Stack } from "aws-cdk-lib";
import { Construct } from "constructs";
import { CloudFrontToApiGatewayToLambda } from "@aws-solutions-constructs/aws-cloudfront-apigateway-lambda";

import { addCfnSuppressRules } from "../../utils/utils";
import { Conditions } from "../common-resources/common-resources-construct";
import { SolutionConstructProps } from "../types";

export interface BackEndProps extends SolutionConstructProps {
  readonly solutionVersion: string;
  readonly solutionName: string;
  readonly secretsManagerPolicy: Policy;
  readonly logsBucket: IBucket;
  readonly uuid: string;
  readonly cloudFrontPriceClass: string;
  readonly conditions: Conditions;
}

export class BackEnd extends Construct {
  public domainName: string;

  constructor(scope: Construct, id: string, props: BackEndProps) {
    super(scope, id);

    const imageHandlerLambdaFunctionRole = new Role(this, "ImageHandlerFunctionRole", {
      assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
      path: "/",
    });
    props.secretsManagerPolicy.attachToRole(imageHandlerLambdaFunctionRole);

    const imageHandlerLambdaFunctionRolePolicy = new Policy(this, "ImageHandlerFunctionPolicy", {
      statements: [
        new PolicyStatement({
          actions: ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"],
          resources: [
            Stack.of(this).formatArn({
              service: "logs",
              resource: "log-group",
              resourceName: "/aws/lambda/*",
              arnFormat: ArnFormat.COLON_RESOURCE_NAME,
            }),
          ],
        }),
        new PolicyStatement({
          actions: ["s3:GetObject", "s3:PutObject", "s3:ListBucket"],
          resources: [
            Stack.of(this).formatArn({
              service: "s3",
              resource: "*",
              region: "",
              account: "",
            }),
          ],
        }),
        new PolicyStatement({
          actions: ["rekognition:DetectFaces", "rekognition:DetectModerationLabels"],
          resources: ["*"],
        }),
      ],
    });

    addCfnSuppressRules(imageHandlerLambdaFunctionRolePolicy, [
      { id: "W12", reason: "rekognition:DetectFaces requires '*' resources." },
    ]);
    imageHandlerLambdaFunctionRole.attachInlinePolicy(imageHandlerLambdaFunctionRolePolicy);

    const imageHandlerLambdaFunction = new NodejsFunction(this, "ImageHandlerLambdaFunction", {
      description: `${props.solutionName} (${props.solutionVersion}): Performs image edits and manipulations`,
      memorySize: 1024,
      runtime: Runtime.NODEJS_16_X,
      timeout: Duration.minutes(15),
      role: imageHandlerLambdaFunctionRole,
      entry: path.join(__dirname, "../../../image-handler/index.ts"),
      environment: {
        AUTO_WEBP: props.autoWebP,
        CORS_ENABLED: props.corsEnabled,
        CORS_ORIGIN: props.corsOrigin,
        SOURCE_BUCKETS: props.sourceBuckets,
        REWRITE_MATCH_PATTERN: "",
        REWRITE_SUBSTITUTION: "",
        ENABLE_SIGNATURE: props.enableSignature,
        SECRETS_MANAGER: props.secretsManager,
        SECRET_KEY: props.secretsManagerKey,
        ENABLE_DEFAULT_FALLBACK_IMAGE: props.enableDefaultFallbackImage,
        DEFAULT_FALLBACK_IMAGE_BUCKET: props.fallbackImageS3Bucket,
        DEFAULT_FALLBACK_IMAGE_KEY: props.fallbackImageS3KeyBucket,
      },
      bundling: {
        externalModules: ["sharp"],
        nodeModules: ["sharp"],
        commandHooks: {
          beforeBundling(inputDir: string, outputDir: string): string[] {
            return [];
          },
          beforeInstall(inputDir: string, outputDir: string): string[] {
            return [];
          },
          afterBundling(inputDir: string, outputDir: string): string[] {
            return [`cd ${outputDir}`, "rm -rf node_modules/sharp && npm install --arch=x64 --platform=linux sharp"];
          },
        },
      },
    });

    const imageHandlerLogGroup = new LogGroup(this, "ImageHandlerLogGroup", {
      logGroupName: `/aws/lambda/${imageHandlerLambdaFunction.functionName}`,
      retention: props.logRetentionPeriod as RetentionDays,
    });

    addCfnSuppressRules(imageHandlerLogGroup, [
      {
        id: "W84",
        reason: "CloudWatch log group is always encrypted by default.",
      },
    ]);

    const cachePolicy = new CustomBackEndCachePolicy(this, "CachePolicy", props);

    const originRequestPolicy = new CustomBackEndOriginRequestPolicy(this, "OriginRequestPolicy", props);

    const apiGatewayRestApi = RestApi.fromRestApiId(
      this,
      "ApiGatewayRestApi",
      Lazy.string({
        produce: () => imageHandlerCloudFrontApiGatewayLambda.apiGateway.restApiId,
      })
    );

    const origin: IOrigin = new HttpOrigin(`${apiGatewayRestApi.restApiId}.execute-api.${Aws.REGION}.amazonaws.com`, {
      originPath: "/image",
      originSslProtocols: [OriginSslPolicy.TLS_V1_1, OriginSslPolicy.TLS_V1_2],
    });

    const cloudFrontDistributionProps: DistributionProps = {
      comment: "Image Handler Distribution for Serverless Image Handler",
      defaultBehavior: {
        origin,
        allowedMethods: AllowedMethods.ALLOW_GET_HEAD,
        viewerProtocolPolicy: ViewerProtocolPolicy.HTTPS_ONLY,
        originRequestPolicy,
        cachePolicy,
      },
      priceClass: props.cloudFrontPriceClass as PriceClass,
      enableLogging: true,
      logBucket: props.logsBucket,
      logFilePrefix: "api-cloudfront/",
      errorResponses: [
        { httpStatus: 500, ttl: Duration.minutes(10) },
        { httpStatus: 501, ttl: Duration.minutes(10) },
        { httpStatus: 502, ttl: Duration.minutes(10) },
        { httpStatus: 503, ttl: Duration.minutes(10) },
        { httpStatus: 504, ttl: Duration.minutes(10) },
      ],
    };

    const logGroupProps = {
      retention: props.logRetentionPeriod as RetentionDays,
    };

    const apiGatewayProps: LambdaRestApiProps = {
      handler: imageHandlerLambdaFunction,
      deployOptions: {
        stageName: "image",
      },
      binaryMediaTypes: ["*/*"],
    };

    const imageHandlerCloudFrontApiGatewayLambda = new CloudFrontToApiGatewayToLambda(
      this,
      "ImageHandlerCloudFrontApiGatewayLambda",
      {
        existingLambdaObj: imageHandlerLambdaFunction,
        insertHttpSecurityHeaders: false,
        logGroupProps,
        cloudFrontDistributionProps,
        apiGatewayProps,
      }
    );

    imageHandlerCloudFrontApiGatewayLambda.apiGateway.node.tryRemoveChild("Endpoint"); // we don't need the RestApi endpoint in the outputs

    this.domainName = imageHandlerCloudFrontApiGatewayLambda.cloudFrontWebDistribution.distributionDomainName;
  }
}

class CustomBackEndCachePolicy extends Resource implements ICachePolicy {
  public readonly cachePolicyId: string;

  constructor(scope: Construct, id: string, props: BackEndProps) {
    super(scope, id, {
      physicalName: `ServerlessImageHandler-${props.uuid}`,
    });

    const cachePolicy = new CfnCachePolicy(this, "Resource", {
      cachePolicyConfig: {
        name: `ServerlessImageHandler-${props.uuid}`,
        defaultTtl: Duration.days(1).toSeconds(),
        minTtl: Duration.seconds(1).toSeconds(),
        maxTtl: Duration.days(365).toSeconds(),
        parametersInCacheKeyAndForwardedToOrigin: {
          enableAcceptEncodingGzip: true,
          enableAcceptEncodingBrotli: false,
          queryStringsConfig: {
            queryStringBehavior: "whitelist",
            queryStrings: ["signature"],
          },
          headersConfig: {
            headerBehavior: "whitelist",
          },
          cookiesConfig: {
            cookieBehavior: "none",
          },
        },
      },
    });

    // https://github.com/aws/aws-cdk/issues/8396#issuecomment-857690411
    cachePolicy.addOverride(
      "Properties.CachePolicyConfig.ParametersInCacheKeyAndForwardedToOrigin.HeadersConfig.Headers",
      {
        "Fn::If": [props.conditions.enableAutoWebPCondition.logicalId, ["origin", "accept"], ["origin"]],
      }
    );

    this.cachePolicyId = cachePolicy.ref;
  }
}

class CustomBackEndOriginRequestPolicy extends Resource implements IOriginRequestPolicy {
  public readonly originRequestPolicyId: string;

  constructor(scope: Construct, id: string, props: BackEndProps) {
    super(scope, id, {
      physicalName: `ServerlessImageHandler-${props.uuid}`,
    });

    const originRequestPolicy = new CfnOriginRequestPolicy(this, "Resource", {
      originRequestPolicyConfig: {
        name: `ServerlessImageHandler-${props.uuid}`,
        headersConfig: {
          headerBehavior: "whitelist",
        },
        queryStringsConfig: {
          queryStringBehavior: "whitelist",
          queryStrings: ["signature"],
        },
        cookiesConfig: {
          cookieBehavior: "none",
        },
      },
    });

    // https://github.com/aws/aws-cdk/issues/8396#issuecomment-857690411
    originRequestPolicy.addOverride("Properties.OriginRequestPolicyConfig.HeadersConfig.Headers", {
      "Fn::If": [props.conditions.enableAutoWebPCondition.logicalId, ["origin", "accept"], ["origin"]],
    });

    this.originRequestPolicyId = originRequestPolicy.ref;
  }
}

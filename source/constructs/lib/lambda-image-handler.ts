import * as path from 'path';
import * as apigw2 from '@aws-cdk/aws-apigatewayv2';
import * as apigw2integ from '@aws-cdk/aws-apigatewayv2-integrations';
import * as cloudfront from '@aws-cdk/aws-cloudfront';
import * as origins from '@aws-cdk/aws-cloudfront-origins';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import * as iam from '@aws-cdk/aws-iam';
import * as lambda from '@aws-cdk/aws-lambda';
import * as s3 from '@aws-cdk/aws-s3';
import * as cdk from '@aws-cdk/core';
import { Aspects, Aws, Construct } from '@aws-cdk/core';


export interface LambdaImageHandlerProps {
  isChinaRegion?: boolean;
  bucketNameParams: cdk.CfnParameter[];
}

export class LambdaImageHandler extends Construct {
  private isNotChinaRegionCondition = new cdk.CfnCondition(this, 'IsNotChinaRegionCondition', {
    expression: cdk.Fn.conditionNot(cdk.Fn.conditionEquals(Aws.PARTITION, 'aws-cn')),
  });
  private originRequestPolicy = new cloudfront.OriginRequestPolicy(this, 'ForwardAllQueryString', {
    queryStringBehavior: cloudfront.OriginRequestQueryStringBehavior.all(),
  });
  private cachePolicy = new cloudfront.CachePolicy(this, 'CacheAllQueryString', {
    queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
  });

  constructor(scope: Construct, id: string, props: LambdaImageHandlerProps) {
    super(scope, id);

    this.enable({ construct: this.originRequestPolicy, if: this.isNotChinaRegionCondition });
    this.enable({ construct: this.cachePolicy, if: this.isNotChinaRegionCondition });

    const bucketNameParamConditionPair = props.bucketNameParams.map((bucket, index): [cdk.CfnParameter, cdk.CfnCondition] => {
      return [
        bucket,
        new cdk.CfnCondition(this, `HasBucket${index}`, {
          expression: cdk.Fn.conditionNot(cdk.Fn.conditionEquals('', bucket.valueAsString)),
        }),
      ];
    });

    const table = new dynamodb.Table(this, 'StyleTable', {
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
    });

    this.cfnOutput('StyleConfig', table.tableName, 'The DynamoDB table of image processing style');

    const layer = new lambda.LayerVersion(this, 'DepsLayer', {
      code: lambda.Code.fromDockerBuild(path.join(__dirname, '../../new-image-handler'), {
        file: 'Dockerfile.lambda.deps',
      }),
      compatibleRuntimes: [lambda.Runtime.NODEJS_12_X],
      description: 'Sharp Deps Layer',
    });

    const lambdaHandler = new lambda.Function(this, 'LambdaHandler', {
      runtime: lambda.Runtime.NODEJS_12_X,
      timeout: cdk.Duration.seconds(30),
      memorySize: 1024,
      code: lambda.Code.fromDockerBuild(path.join(__dirname, '../../new-image-handler'), {
        file: 'Dockerfile.lambda',
      }),
      environment: {
        REGION: Aws.REGION,
        NODE_ENV: 'production',
        NODE_OPTIONS: '--enable-source-maps',
        SRC_BUCKET: props.bucketNameParams[0].valueAsString,
        STYLE_TABLE_NAME: table.tableName,
      },
      handler: 'src/index-lambda.handler',
      layers: [layer],
    });

    lambdaHandler.role?.addToPrincipalPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        's3:GetObject',
      ],
      resources: bucketNameParamConditionPair.map(([bucket, condition]) =>
        cdk.Fn.conditionIf(condition.logicalId, `arn:${Aws.PARTITION}:s3:::${bucket.valueAsString}/*`, Aws.NO_VALUE).toString(),
      ),
    }));
    table.grantReadData(lambdaHandler);

    const api = new apigw2.HttpApi(this, 'ApiGw2');
    api.addRoutes({
      path: '/{proxy+}',
      methods: [apigw2.HttpMethod.ANY],
      integration: new apigw2integ.LambdaProxyIntegration({ handler: lambdaHandler }),
    });

    this.cfnOutput('ApiGw2Endpoint', api.apiEndpoint);

    bucketNameParamConditionPair.forEach(([bucket, condition], index) => {
      const s3bucket = s3.Bucket.fromBucketAttributes(this, `TheBucket${index}`, {
        bucketName: bucket.valueAsString,
        region: Aws.REGION,
      });
      const s3oai = new cloudfront.OriginAccessIdentity(this, `S3Origin${index}`, {
        comment: `Identity for s3://${s3bucket.bucketName}`,
      });
      const bucketPolicy = new iam.PolicyStatement({
        resources: [s3bucket.arnForObjects('*')],
        actions: ['s3:GetObject'],
        principals: [s3oai.grantPrincipal],
      });
      s3bucket.addToResourcePolicy(bucketPolicy);
      this.cfnOutput(`Bucket${index}`, `s3://${bucket.valueAsString}`).condition = condition;
      this.cfnOutput(`BucketPolicy${index}`, `${JSON.stringify(bucketPolicy.toStatementJson())}`, `Please add this statement into bucket${index}'s bucket policy`).condition = condition;

      let dist: cloudfront.IDistribution;
      if (props.isChinaRegion) {
        dist = new cloudfront.CloudFrontWebDistribution(this, `WebDist${index}`, {
          comment: `${cdk.Stack.of(this).stackName} distribution${index} for s3://${bucket.valueAsString}`,
          priceClass: cloudfront.PriceClass.PRICE_CLASS_ALL,
          enableIpV6: false,
          defaultRootObject: '/',
          originConfigs: [
            {
              customOriginSource: {
                domainName: `${api.apiId}.execute-api.${Aws.REGION}.${Aws.URL_SUFFIX}`,
                originProtocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
                originHeaders: {
                  'x-bucket': bucket.valueAsString,
                },
              },
              failoverS3OriginSource: {
                s3BucketSource: s3bucket,
                originAccessIdentity: s3oai,
              },
              failoverCriteriaStatusCodes: [403],
              behaviors: [
                {
                  isDefaultBehavior: true,
                  forwardedValues: {
                    queryString: true, // Forward All
                    cookies: {
                      forward: 'none',
                    },
                    headers: [
                      'Origin',
                      'Accept',
                    ],
                  },
                },
              ],
            },
          ],
          errorConfigurations: [
            { errorCode: 500, errorCachingMinTtl: 10 },
            { errorCode: 501, errorCachingMinTtl: 10 },
            { errorCode: 502, errorCachingMinTtl: 10 },
            { errorCode: 503, errorCachingMinTtl: 10 },
            { errorCode: 504, errorCachingMinTtl: 10 },
          ],
        });
      } else {
        dist = new cloudfront.Distribution(this, `Dist${index}`, {
          comment: `${cdk.Stack.of(this).stackName} distribution${index} for s3://${bucket.valueAsString}`,
          defaultBehavior: {
            origin: new origins.OriginGroup({
              primaryOrigin: new origins.HttpOrigin(`${api.apiId}.execute-api.${Aws.REGION}.${Aws.URL_SUFFIX}`, {
                protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
                customHeaders: {
                  'x-bucket': bucket.valueAsString,
                },
              }),
              fallbackOrigin: new origins.S3Origin(s3bucket, { originAccessIdentity: s3oai }),
              fallbackStatusCodes: [403],
            }),
            viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            originRequestPolicy: this.originRequestPolicy,
            cachePolicy: this.cachePolicy,
          },
          errorResponses: [
            { httpStatus: 500, ttl: cdk.Duration.seconds(10) },
            { httpStatus: 501, ttl: cdk.Duration.seconds(10) },
            { httpStatus: 502, ttl: cdk.Duration.seconds(10) },
            { httpStatus: 503, ttl: cdk.Duration.seconds(10) },
            { httpStatus: 504, ttl: cdk.Duration.seconds(10) },
          ],
        });
      }

      this.cfnOutput(`DistUrl${index}`, `https://${dist.distributionDomainName}`, `The CloudFront distribution url${index}`).condition = condition;

      this.enable({ construct: dist, if: condition });
    });
  }

  protected cfnOutput(id: string, value: string, description?: string): cdk.CfnOutput {
    const o = new cdk.CfnOutput(this, id, { value, description });
    o.overrideLogicalId(id);
    return o;
  }

  protected enable(param: { construct: cdk.IConstruct; if: cdk.CfnCondition }) {
    Aspects.of(param.construct).add(new InjectCondition(param.if));
  }
}


class InjectCondition implements cdk.IAspect {
  public constructor(private condition: cdk.CfnCondition) { }

  public visit(node: cdk.IConstruct): void {
    if (node instanceof cdk.CfnResource) {
      node.cfnOptions.condition = this.condition;
    }
  }
}

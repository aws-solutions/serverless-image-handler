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
import { Aspects, Construct } from '@aws-cdk/core';


export interface LambdaImageHandlerProps {
  bucketNameParams: cdk.CfnParameter[];
}

export class LambdaImageHandler extends Construct {
  private originRequestPolicy = new cloudfront.OriginRequestPolicy(this, 'ForwardAllQueryString', {
    queryStringBehavior: cloudfront.OriginRequestQueryStringBehavior.all(),
  });
  private cachePolicy = new cloudfront.CachePolicy(this, 'CacheAllQueryString', {
    queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
  });

  constructor(scope: Construct, id: string, props: LambdaImageHandlerProps) {
    super(scope, id);

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
    });

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
        REGION: cdk.Aws.REGION,
        NODE_ENV: 'production',
        NODE_OPTIONS: '--enable-source-maps',
        SRC_BUCKET: 'sih-input',
        STYLE_TABLE_NAME: table.tableName,
        USE_STYLE_CONFIG: 'true',
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
        cdk.Fn.conditionIf(condition.logicalId, `arn:${cdk.Aws.PARTITION}:s3:::${bucket.valueAsString}/*`, cdk.Aws.NO_VALUE).toString(),
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
      const dist = new cloudfront.Distribution(this, `Dist${index}`, {
        comment: `${cdk.Stack.of(this).stackName} distribution${index} for s3://${bucket.valueAsString}`,
        defaultBehavior: {
          origin: new origins.OriginGroup({
            primaryOrigin: new origins.HttpOrigin(`${api.apiId}.execute-api.${cdk.Aws.REGION}.${cdk.Aws.URL_SUFFIX}`, {
              protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
              customHeaders: {
                'x-bucket': bucket.valueAsString,
              },
            }),
            fallbackOrigin: new origins.S3Origin(s3.Bucket.fromBucketName(this, `Bucket${index}`, bucket.valueAsString)),
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
      const output = this.cfnOutput(`DistUrl${index}`, `https://${dist.distributionDomainName}`, `The CloudFront distribution url${index}`);
      output.condition = condition;

      class InjectCondition implements cdk.IAspect {
        public visit(node: cdk.IConstruct): void {
          if (node instanceof cdk.CfnResource) {
            node.cfnOptions.condition = condition;
          }
        }
      }
      Aspects.of(dist).add(new InjectCondition());
    });
  }

  protected cfnOutput(id: string, value: string, description?: string): cdk.CfnOutput {
    return new cdk.CfnOutput(this, id, { value, description });
  }
}

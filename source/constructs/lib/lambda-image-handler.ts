import * as path from 'path';
// import * as cloudfront from '@aws-cdk/aws-cloudfront';
// import * as origins from '@aws-cdk/aws-cloudfront-origins';
// import * as dynamodb from '@aws-cdk/aws-dynamodb';
// import * as ec2 from '@aws-cdk/aws-ec2';
// import * as ecs from '@aws-cdk/aws-ecs';
// import * as ecsPatterns from '@aws-cdk/aws-ecs-patterns';
import * as iam from '@aws-cdk/aws-iam';
import * as lambda from '@aws-cdk/aws-lambda';
import * as apigw2 from '@aws-cdk/aws-apigatewayv2';
import * as apigw2integ from '@aws-cdk/aws-apigatewayv2-integrations';
// import * as s3 from '@aws-cdk/aws-s3';
import * as cdk from '@aws-cdk/core';
import { Construct } from '@aws-cdk/core';


export class LambdaImageHandler extends Construct {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const layer = new lambda.LayerVersion(this, 'DepsLayer', {
      code: lambda.Code.fromAsset(path.join(__dirname, '../../new-image-handler'), {
        bundling: {
          image: lambda.Runtime.NODEJS_12_X.bundlingImage,
          command: [
            'bash', '-xc', [
              'export npm_config_update_notifier=false',
              'export npm_config_cache=$(mktemp -d)', // https://github.com/aws/aws-cdk/issues/8707#issuecomment-757435414
              'export npm_config_platform=linux npm_config_arch=x64',
              'cd $(mktemp -d)',
              'cp -v /asset-input/package*.json /asset-input/yarn.lock .',
              'npx yarn install --prod',
              'mkdir -p /asset-output/nodejs/',
              'cp -au node_modules /asset-output/nodejs/',
            ].join('&&'),
          ],
        },
      }),
      compatibleRuntimes: [lambda.Runtime.NODEJS_12_X],
      description: 'Sharp Deps Layer',
    });

    const lambdaHandler = new lambda.Function(this, 'LambdaHandler', {
      runtime: lambda.Runtime.NODEJS_12_X,
      timeout: cdk.Duration.seconds(30),
      memorySize: 1024,
      code: lambda.Code.fromAsset(path.join(__dirname, '../../new-image-handler'), {
        bundling: {
          image: lambda.Runtime.NODEJS_12_X.bundlingImage,
          command: [
            'bash', '-xc', [
              'export npm_config_update_notifier=false',
              'export npm_config_cache=$(mktemp -d)', // https://github.com/aws/aws-cdk/issues/8707#issuecomment-757435414
              'export npm_config_platform=linux npm_config_arch=x64',
              'cd $(mktemp -d)',
              'cp -rvf /asset-input/{src,test,*.json,.*.json,*.lock} .',
              'npx yarn',
              'npx yarn build',
              'cp -au lib/src /asset-output/'
            ].join('&&'),
          ],
        },
      }),
      environment: {
        NODE_ENV: 'production',
        SOURCE_BUCKETS: 'sih-input',
      },
      handler: 'index.handler',
      layers: [layer],
    });

    const api = new apigw2.HttpApi(this, 'ApiGw2');
    api.addRoutes({
      path: '/{proxy+}',
      methods: [apigw2.HttpMethod.ANY],
      integration: new apigw2integ.LambdaProxyIntegration({ handler: lambdaHandler }),
    });

    lambdaHandler.role?.addToPrincipalPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        's3:GetObject',
      ],
      resources: ['*'],
    }));

    this.cfnOutput('ApiEndpoint', { value: api.apiEndpoint });

    // const srcBucket = getOrCreateBucket(this, 'SrcBucket');
    // const table = new dynamodb.Table(this, 'StyleTable', {
    //   partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
    //   billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    // });
    // const albFargateService = new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'Service', {
    //   vpc: getOrCreateVpc(this),
    //   cpu: 2048,
    //   memoryLimitMiB: 1024 * 4,
    //   minHealthyPercent: 100,
    //   maxHealthyPercent: 200,
    //   desiredCount: 2,
    //   taskImageOptions: {
    //     image: ecs.ContainerImage.fromAsset(path.join(__dirname, '../../new-image-handler')),
    //     containerPort: 8080,
    //     environment: {
    //       REGION: Aws.REGION,
    //       SRC_BUCKET: srcBucket.bucketName,
    //       STYLE_TABLE_NAME: table.tableName,
    //     },
    //   },
    // });
    // albFargateService.targetGroup.configureHealthCheck({
    //   path: '/',
    // });
    // albFargateService.service.autoScaleTaskCount({
    //   minCapacity: 2,
    //   maxCapacity: 20,
    // }).scaleOnCpuUtilization('CpuScaling', {
    //   targetUtilizationPercent: 50,
    // });
    // srcBucket.grantRead(albFargateService.taskDefinition.taskRole);
    // table.grantReadData(albFargateService.taskDefinition.taskRole);

    // // TODO: Add restriction access to ALB
    // // https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/restrict-access-to-load-balancer.html
    // // https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-elasticloadbalancingv2-listenerrule.html

    // this.distribution(new origins.OriginGroup({
    //   primaryOrigin: new origins.LoadBalancerV2Origin(albFargateService.loadBalancer, {
    //     protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
    //   }),
    //   fallbackOrigin: new origins.S3Origin(srcBucket, {
    //     originAccessIdentity: this.withS3OAI(srcBucket),
    //   }),
    //   fallbackStatusCodes: [403],
    // }));

    // this.output('SrcBucketS3Url', `s3://${srcBucket.bucketName}`);
  }

  // private withS3OAI(bucket: s3.IBucket): cloudfront.IOriginAccessIdentity {
  //   // https://stackoverflow.com/a/60917015/4108187
  //   const s3oai = new cloudfront.OriginAccessIdentity(this, 'OAI');
  //   const policyStatement = new iam.PolicyStatement({
  //     actions: [
  //       's3:GetObject',
  //     ],
  //     resources: [
  //       bucket.arnForObjects('*'),
  //     ],
  //     principals: [
  //       new iam.CanonicalUserPrincipal(s3oai.cloudFrontOriginAccessIdentityS3CanonicalUserId),
  //     ],
  //   });

  //   if (bucket.policy) {
  //     bucket.policy.document.addStatements(policyStatement);
  //   } else {
  //     new s3.BucketPolicy(this, 'BucketPolicy', { bucket: bucket }).document.addStatements(policyStatement);
  //   }
  //   return s3oai;
  // }

  // private distribution(origin: cloudfront.IOrigin) {
  //   const originRequestPolicy = new cloudfront.OriginRequestPolicy(this, 'ForwardAllQueryString', {
  //     queryStringBehavior: cloudfront.OriginRequestQueryStringBehavior.all(),
  //   });
  //   const cachePolicy = new cloudfront.CachePolicy(this, 'CacheAllQueryString', {
  //     queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
  //   });
  //   const dist = new cloudfront.Distribution(this, 'Distribution', {
  //     comment: `${Stack.of(this).stackName} distribution`,
  //     defaultBehavior: {
  //       origin,
  //       viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
  //       originRequestPolicy,
  //       cachePolicy,
  //     },
  //     errorResponses: [
  //       { httpStatus: 500, ttl: Duration.seconds(10) },
  //       { httpStatus: 501, ttl: Duration.seconds(10) },
  //       { httpStatus: 502, ttl: Duration.seconds(10) },
  //       { httpStatus: 503, ttl: Duration.seconds(10) },
  //       { httpStatus: 504, ttl: Duration.seconds(10) },
  //     ],
  //   });

  //   this.output('CFDistributionUrl', `https://${dist.distributionDomainName}`, 'The CloudFront distribution url');
  // }

  // private output(id: string, value: string, description?: string) {
  //   new CfnOutput(this, id, { value, description });
  // }

  protected cfnOutput(id: string, props: cdk.CfnOutputProps): void {
    new cdk.CfnOutput(this, id, props);
  }
}

// const env = {
//   account: process.env.CDK_DEFAULT_ACCOUNT,
//   region: 'us-west-2',
// };

// const app = new App();

// new ECSImageHandlerStack(app, 'cdk-image-handler', { env });

// app.synth();

// function getOrCreateVpc(scope: Construct): ec2.IVpc {
//   if (scope.node.tryGetContext('use_default_vpc') === '1' || process.env.CDK_USE_DEFAULT_VPC === '1') {
//     return ec2.Vpc.fromLookup(scope, 'Vpc', { isDefault: true });
//   } else if (scope.node.tryGetContext('use_vpc_id')) {
//     return ec2.Vpc.fromLookup(scope, 'Vpc', { vpcId: scope.node.tryGetContext('use_vpc_id') });
//   }
//   return new ec2.Vpc(scope, 'Vpc', { maxAzs: 3, natGateways: 1 });
// }

// function getOrCreateBucket(scope: Construct, id: string): s3.IBucket {
//   const bucketName = scope.node.tryGetContext('use_bucket');
//   if (bucketName) {
//     return s3.Bucket.fromBucketName(scope, id, bucketName);
//   }
//   return new s3.Bucket(scope, id, { versioned: true });
// }
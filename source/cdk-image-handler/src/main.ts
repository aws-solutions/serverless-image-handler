import * as path from 'path';
import * as cloudfront from '@aws-cdk/aws-cloudfront';
import * as origins from '@aws-cdk/aws-cloudfront-origins';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as ecs from '@aws-cdk/aws-ecs';
import * as ecsPatterns from '@aws-cdk/aws-ecs-patterns';
import * as s3 from '@aws-cdk/aws-s3';
import { App, Construct, Stack, StackProps, CfnOutput } from '@aws-cdk/core';


export class ImageHandlerStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    const srcBucket = new s3.Bucket(this, 'SrcBucket');
    const albFargateService = new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'Service', {
      vpc: getOrCreateVpc(this),
      cpu: 2048,
      memoryLimitMiB: 1024 * 4,
      desiredCount: 2,
      taskImageOptions: {
        image: ecs.ContainerImage.fromAsset(path.join(__dirname, 'app')),
        containerPort: 8080,
        environment: {
          SRC_BUCKET: srcBucket.bucketName,
        },
      },
    });
    albFargateService.targetGroup.configureHealthCheck({
      path: '/',
    });
    albFargateService.service.autoScaleTaskCount({
      minCapacity: 2,
      maxCapacity: 20,
    }).scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 50,
    });
    srcBucket.grantRead(albFargateService.taskDefinition.taskRole);

    // TODO: Add restriction access to ALB
    // https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/restrict-access-to-load-balancer.html
    // https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-elasticloadbalancingv2-listenerrule.html

    this.distribution(new origins.OriginGroup({
      primaryOrigin: new origins.LoadBalancerV2Origin(albFargateService.loadBalancer, {
        protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
      }),
      fallbackOrigin: new origins.S3Origin(srcBucket),
      fallbackStatusCodes: [403],
    }));
  }

  private distribution(origin: cloudfront.IOrigin) {
    const originRequestPolicy = new cloudfront.OriginRequestPolicy(this, 'OriginRequestPolicy', {
      originRequestPolicyName: 'ForwardAllQueryString',
      queryStringBehavior: cloudfront.OriginRequestQueryStringBehavior.all(),
    });
    const cachePolicy = new cloudfront.CachePolicy(this, 'CachePolicy', {
      cachePolicyName: 'CacheAllQueryString',
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
    });
    const dist = new cloudfront.Distribution(this, 'Distribution', {
      comment: `${this.stackName} distribution`,
      defaultBehavior: {
        origin,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        originRequestPolicy,
        cachePolicy,
      },
    });

    this.output('CFDistributionUrl', `https://${dist.distributionDomainName}`, 'The CloudFront distribution url');
  }

  private output(id: string, value: string, description? :string) {
    new CfnOutput(this, id, { value, description });
  }
}

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: 'us-west-2',
};

const app = new App();

new ImageHandlerStack(app, 'cdk-image-handler', { env });

app.synth();

function getOrCreateVpc(scope: Construct): ec2.IVpc {
  if (scope.node.tryGetContext('use_default_vpc') === '1' || process.env.CDK_USE_DEFAULT_VPC === '1') {
    return ec2.Vpc.fromLookup(scope, 'Vpc', { isDefault: true });
  } else if (scope.node.tryGetContext('use_vpc_id')) {
    return ec2.Vpc.fromLookup(scope, 'Vpc', { vpcId: scope.node.tryGetContext('use_vpc_id') });
  }
  return new ec2.Vpc(scope, 'Vpc', { maxAzs: 3, natGateways: 1 });
}
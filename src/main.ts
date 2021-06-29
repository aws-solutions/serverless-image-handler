import * as path from 'path';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as ecs from '@aws-cdk/aws-ecs';
import * as ecsPatterns from '@aws-cdk/aws-ecs-patterns';
import * as s3 from '@aws-cdk/aws-s3';
import { App, Construct, Stack, StackProps } from '@aws-cdk/core';


export class ImageHandlerStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    const albFargateService = new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'Service', {
      vpc: getOrCreateVpc(this),
      cpu: 512,
      memoryLimitMiB: 1024,
      desiredCount: 2,
      taskImageOptions: {
        image: ecs.ContainerImage.fromAsset(path.join(__dirname, 'app')),
        containerPort: 8080,
      },
    });
    albFargateService.targetGroup.configureHealthCheck({
      path: '/',
    });

    const srcBucket = new s3.Bucket(this, 'SrcBucket');
    srcBucket.grantRead(albFargateService.taskDefinition.taskRole);
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
import * as path from 'path';
import * as ecs from '@aws-cdk/aws-ecs';
import * as ecsPatterns from '@aws-cdk/aws-ecs-patterns';
import { App, Construct, Stack, StackProps } from '@aws-cdk/core';


export class ImageHandlerStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    const loadBalancedFargateService = new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'Service', {
      memoryLimitMiB: 1024,
      cpu: 512,
      desiredCount: 2,
      taskImageOptions: {
        image: ecs.ContainerImage.fromAsset(path.join(__dirname, 'docker')),
      },
    });

    loadBalancedFargateService.targetGroup.configureHealthCheck({
      path: '/',
    });
  }
}

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: 'us-west-2',
};

const app = new App();

new ImageHandlerStack(app, 'cdk-image-handler', { env });

app.synth();
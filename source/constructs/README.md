# Table of Contents

- [Table of Contents](#table-of-contents)
- [Overview](#overview)
  - [Lambda Image Handler](#lambda-image-handler)
  - [ECS Image Handler](#ecs-image-handler)
    - [Workflow](#workflow)
    - [Prerequisites](#prerequisites)
    - [How to use?](#how-to-use)

# Overview

This cdk construct includes two different implementations of serverless image handler:

1. Lambda Image Handler
2. ECS Image Handler

## Lambda Image Handler

![architecture](../../architecture.png)

TODO

## ECS Image Handler

![architecture](./ecs-image-handler-arch.svg)

This is an ECS Fargate based version of serverless image handler. The key features are:

1. Support output payload size exceed 6MB.
2. `x-oss-process` syntax.
3. Modular function design.

### Workflow

1. An image modification request will be sent through CloudFront.
2. If the request is not cached by CloudFront it will firstly be sent to backend ECS Fargate cluster over Application Load Balancer. (i.e. origin #1)
3. The ECS Fargate service will get pictures from S3 and do some modification based on the request return back to the CloudFront.
4. If the request doesn't need any modification or request origin pictures. CloudFront will firstly send the request to origin #1. But the origin #1 will just return HTTP 403 Forbidden which's telling the CloudFront to failback to origin #2. This an intended design to tell CloudFront to directly access the picture stored in S3 without through ECS cluster.

### Prerequisites

1. [nodejs](https://nodejs.org/) >= 14.0.0
2. [docker](https://www.docker.com/)
3. [yarn](https://yarnpkg.com/getting-started/install)
4. [aws-cdk](https://docs.aws.amazon.com/cdk/latest/guide/getting_started.html)
5. [cdk bootstrap](https://docs.aws.amazon.com/cdk/latest/guide/cli.html#cli-bootstrap)

### How to use?

```bash
cd source/constructs
# Install dependencies
yarn
# Run test
yarn test
# Deploy stack
CDK_DEPLOY_REGION=us-west-2 yarn deploy serverless-ecr-image-handler-stack
# Or deploy stack to an existing vpc
CDK_DEPLOY_REGION=us-west-2 yarn deploy serverless-ecr-image-handler-stack -c use_vpc_id=vpc-123124124124
# Destroy stack if you need
yarn destroy serverless-ecr-image-handler-stack
```

Once it is deployed you will get:

```
 ✅  serverless-ecr-image-handler-stack

Outputs:
serverless-ecr-image-handler-stack.serverlessecrimagehandlerstackCFDistributionUrl1454FE90 = https://ABCDEFGH.cloudfront.net
serverless-ecr-image-handler-stack.serverlessecrimagehandlerstackServiceLoadBalancerDNSDB026A6D = serve-serve-ABCDEF.us-west-2.elb.amazonaws.com
serverless-ecr-image-handler-stack.serverlessecrimagehandlerstackServiceServiceURLE05B511A = http://serve-serve-ABCDEF.us-west-2.elb.amazonaws.com
serverless-ecr-image-handler-stack.serverlessecrimagehandlerstackSrcBucketS3Url593801C5 = s3://serverless-ecr-image-han-serverlessecrimagehandle-ABCDE

Stack ARN:
arn:aws:cloudformation:us-west-2:000000000:stack/serverless-ecr-image-handler-stack/0000000-0000-0000-0000-0000
✨  Done in 593.00s.
```

Then you could try to open `cdk-image-handler.CFDistributionUrl` https://ABCDEFG.cloudfront.net/example.jpg?x-oss-process=image/resize,w_500,h_500,limit_0/quality,q_50
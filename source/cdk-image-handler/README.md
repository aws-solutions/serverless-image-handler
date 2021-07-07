## Architecture

![architecture](./architecture.svg)

This is an ECS Fargate based version of serverless image handler. The key features are:

1. Support output payload size exceed 6MB.
2. `x-oss-process` syntax.
3. Modular function design.

## Workflow

1. An image modification request will be sent through CloudFront.
2. If the request is not cached by CloudFront it will firstly be sent to backend ECS Fargate cluster over Application Load Balancer. (i.e. origin #1)
3. The ECS Fargate service will get pictures from S3 and do some modification based on the request return back to the CloudFront.
4. If the request doesn't need any modification or request origin pictures. CloudFront will firstly send the request to origin #1. But the origin #1 will just return HTTP 403 Forbidden which's telling the CloudFront to failback to origin #2. This an intended design to tell CloudFront to directly access the picture stored in S3 without through ECS cluster.

## Prerequisites

1. [nodejs](https://nodejs.org/) >= 14.0.0
2. [docker](https://www.docker.com/)
3. [yarn](https://yarnpkg.com/getting-started/install)
4. [aws-cdk](https://docs.aws.amazon.com/cdk/latest/guide/getting_started.html)
5. [cdk bootstrap](https://docs.aws.amazon.com/cdk/latest/guide/cli.html#cli-bootstrap)

## How to use?

```bash
cd source/cdk-image-handler
# Install dependencies
yarn
# Run test
yarn test
# Deploy stack
yarn deploy
# Or deploy stack to an existing vpc
yarn deploy -c use_vpc_id=vpc-1234567890
# Destroy stack if you need
yarn destroy
```

Once it is deployed you will get:

```
cdk-image-handler: deploying...

 ✅  cdk-image-handler (no changes)

Outputs:
cdk-image-handler.CFDistributionUrl = https://ABCDEFG.cloudfront.net
cdk-image-handler.ServiceLoadBalancerDNSEC5B149E = cdk-i-Servi-ABCDEFG.us-west-2.elb.amazonaws.com
cdk-image-handler.ServiceServiceURL250C0FB6 = http://cdk-i-Servi-ABCDEFG.us-west-2.elb.amazonaws.com

Stack ARN:
arn:aws:cloudformation:us-west-2:********:stack/cdk-image-handler/********
✨  Done in 9.67s.
```

Then you could try to open `cdk-image-handler.CFDistributionUrl` https://ABCDEFG.cloudfront.net/example.jpg?x-oss-process=image/resize,w_500,h_500,limit_0/quality,q_50
**_Important Notice:_**
Due to a [change in the AWS Lambda execution environment](https://aws.amazon.com/blogs/compute/upcoming-updates-to-the-aws-lambda-execution-environment/), Serverless Image Handler v3 deployments are functionally broken. To address the issue we have released [minor version update v3.1.1](https://solutions-reference.s3.amazonaws.com/serverless-image-handler/v3.1.1/serverless-image-handler.template). We recommend all users of v3 to run cloudformation stack update with v3.1.1. Additionally, we suggest you to look at v5 of the solution and migrate to v5 if it addresses all of your use cases.

# AWS Serverless Image Handler Lambda wrapper for SharpJS
A solution to dynamically handle images on the fly, utilizing Sharp (https://sharp.pixelplumbing.com/en/stable/).
Published version, additional details and documentation are available here: https://aws.amazon.com/solutions/serverless-image-handler/

_Note:_ it is recommended to build the application binary on Amazon Linux.

## On This Page
- [Architecture Overview](#architecture-overview)
- [Creating a custom build](#creating-a-custom-build)
- [External Contributors](#external-contributors)
- [License](#license)

## Architecture Overview
![Architecture](architecture.png)

The AWS CloudFormation template deploys an Amazon CloudFront distribution, Amazon API Gateway REST API, and an AWS Lambda function. Amazon CloudFront provides a caching layer to reduce the cost of image processing and the latency of subsequent image delivery. The Amazon API Gateway provides endpoint resources and triggers the AWS Lambda function. The AWS Lambda function retrieves the image from the customer's Amazon Simple Storage Service (Amazon S3) bucket and uses Sharp to return a modified version of the image to the API Gateway. Additionally, the solution generates a CloudFront domain name that provides cached access to the image handler API.

_**Note**:_ From v5.0, all AWS CloudFormation template resources are created be [AWS CDK](https://aws.amazon.com/cdk/) and [AWS Solutions Constructs](https://aws.amazon.com/solutions/constructs/). Since the AWS CloudFormation template resources have the same logical ID comparing to v4.x, it makes the solution upgradable mostly from v4.x to v5.

## Creating a custom build
The solution can be deployed through the CloudFormation template available on the solution home page.
To make changes to the solution, download or clone this repo, update the source code and then run the deployment/build-s3-dist.sh script to deploy the updated Lambda code to an Amazon S3 bucket in your account.

### Prerequisites:
* [AWS Command Line Interface](https://aws.amazon.com/cli/)
* Node.js 12.x or later

### 1. Clone the repository
```bash
git clone https://github.com/awslabs/serverless-image-handler.git
```

### 2. Run unit tests for customization
Run unit tests to make sure added customization passes the tests:
```bash
cd ./deployment
chmod +x ./run-unit-tests.sh
./run-unit-tests.sh
```

### 3. Declare environment variables
```bash
export REGION=aws-region-code # the AWS region to launch the solution (e.g. us-east-1)
export DIST_OUTPUT_BUCKET=my-bucket-name # bucket where customized code will reside
export SOLUTION_NAME=my-solution-name # the solution name
export VERSION=my-version # version number for the customized code
```

### 4. Create an Amazon S3 Bucket
The CloudFormation template is configured to pull the Lambda deployment packages from Amazon S3 bucket in the region the template is being launched in. Create a bucket in the desired region with the region name appended to the name of the bucket.
```bash
aws s3 mb s3://$DIST_OUTPUT_BUCKET-$REGION --region $REGION
```

### 5. Create the deployment packages
Build the distributable:
```bash
chmod +x ./build-s3-dist.sh
./build-s3-dist.sh $DIST_OUTPUT_BUCKET $SOLUTION_NAME $VERSION
```

Deploy the distributable to the Amazon S3 bucket in your account:
```bash
aws s3 sync ./regional-s3-assets/ s3://$DIST_OUTPUT_BUCKET-$REGION/$SOLUTION_NAME/$VERSION/ --acl bucket-owner-full-control
aws s3 sync ./global-s3-assets/ s3://$DIST_OUTPUT_BUCKET-$REGION/$SOLUTION_NAME/$VERSION/ --acl bucket-owner-full-control
```

### 6. Launch the CloudFormation template.
* Get the link of the `serverless-image-handler.template` uploaded to your Amazon S3 bucket.
* Deploy the Serverless Image Handler solution to your account by launching a new AWS CloudFormation stack using the S3 link of the `serverless-image-handler.template`.

## External Contributors
- [@leviwilson](https://github.com/leviwilson) for [#117](https://github.com/awslabs/serverless-image-handler/pull/117)
- [@rpong](https://github.com/rpong) for [#130](https://github.com/awslabs/serverless-image-handler/pull/130)
- [@harriswong](https://github.com/harriswong) for [#138](https://github.com/awslabs/serverless-image-handler/pull/138)
- [@ganey](https://github.com/ganey) for [#139](https://github.com/awslabs/serverless-image-handler/pull/139)
- [@browniebroke](https://github.com/browniebroke) for [#151](https://github.com/awslabs/serverless-image-handler/pull/151), [#152](https://github.com/awslabs/serverless-image-handler/pull/152)
- [@john-shaffer](https://github.com/john-shaffer) for [#158](https://github.com/awslabs/serverless-image-handler/pull/158)
- [@toredash](https://github.com/toredash) for [#174](https://github.com/awslabs/serverless-image-handler/pull/174), [#195](https://github.com/awslabs/serverless-image-handler/pull/195)
- [@lith-imad](https://github.com/lith-imad) for [#194](https://github.com/awslabs/serverless-image-handler/pull/194)
- [@pch](https://github.com/pch) for [#227](https://github.com/awslabs/serverless-image-handler/pull/227)
- [@atrope](https://github.com/atrope) for [#201](https://github.com/awslabs/serverless-image-handler/pull/201)
- [@bretto36](https://github.com/bretto36) for [#182](https://github.com/awslabs/serverless-image-handler/pull/182)
- [@makoncline](https://github.com/makoncline) for [#255](https://github.com/awslabs/serverless-image-handler/pull/255)

***
## License
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.<br />
SPDX-License-Identifier: Apache-2.0

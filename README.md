**_Important Notice:_**
Due to a [change in the AWS Lambda execution environment](https://aws.amazon.com/blogs/compute/upcoming-updates-to-the-aws-lambda-execution-environment/), Serverless Image Handler v3 deployments are functionally broken. To address the issue we have released [minor version update v3.1.1](https://solutions-reference.s3.amazonaws.com/serverless-image-handler/v3.1.1/serverless-image-handler.template). We recommend all users of v3 to run cloudformation stack update with v3.1.1. Additionally, we suggest you to look at v4 of the solution and migrate to v4 if it addresses all of your use cases.

# AWS Serverless Image Handler Lambda wrapper for SharpJS
A solution to dynamically handle images on the fly, utilizing Sharp (https://sharp.pixelplumbing.com/en/stable/).
Published version, additional details and documentation are available here: https://aws.amazon.com/solutions/serverless-image-handler/

_Note:_ it is recommend to build the application binary on Amazon Linux.

## Building distributable for customization
* Clone the repository, then make the desired code changes
```bash
git clone https://github.com/awslabs/serverless-image-handler.git
```

* Run unit tests to make sure added customization passes the tests:
```
cd ./deployment
chmod +x ./run-unit-tests.sh
./run-unit-tests.sh
```

* Create an Amazon S3 Bucket
```
aws s3 mb s3://my-bucket-us-east-1 --region us-east-1
```

* Navigate to the deployment folder and build the distributable
```bash
chmod +x ./build-s3-dist.sh
./build-s3-dist.sh my-bucket serverless-image-handler my-version
```

> Note: The build-s3-dist script expects the bucket name as one of its parameters, and this value should not include the region suffix.

* Deploy the distributable to an Amazon S3 bucket in your account (you must have the AWS CLI installed)
```bash
aws s3 cp ./regional-s3-assets/ s3://my-bucket-us-east-1/serverless-image-handler/my-version/ --recursive --acl bucket-owner-full-control
```

* Get the link of the serverless-image-handler.template uploaded to your Amazon S3 bucket

* Deploy the Serverless Image Handler solution to your account by launching a new AWS CloudFormation stack using the link of the serverless-image-handler.template

***

Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

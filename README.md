# AWS Serverless Image Handler Lambda wrapper for Thumbor
A solution to dynamically handle images on the fly, utilizing Thumbor (thumbor.org).
Published version, additional details and documentation are available here: https://aws.amazon.com/answers/web-applications/serverless-image-handler/

## Docker Environment Setup
In order to build the package locally, you'll need to build the docker image. In order to do so, run the following command:

```bash
docker build -t serverless-image-handler .
```

This will build a docker image that has the following properties:

* pinned to the `amazonlinux` version that [Lambda runs on](https://docs.aws.amazon.com/lambda/latest/dg/current-supported-versions.html)
* pinned yum repository to `releasever=2017.03`
  * this is important when building `pycurl` so that the compiled version of libcurl does not differ from the runtime version on the Lambda AMI
* has all of the base requirements installed
  * libpng
  * libjpeg
  * pngcrush
  * gifsicle
  * optipng
  * pngquant

## Building Lambda Package
To build the Lambda package, use the `serverless-image-handler` image that was built earlier. The following command will build the deployment packages:

```bash
docker run -it --rm --volume $PWD:/lambda serverless-image-handler source-bucket-base-name
```

`source-bucket-base-name` should be the base name for the S3 bucket location where the template will source the Lambda code from.
The template will append '-[region_name]' to this value.
For example: ./build-s3-dist.sh solutions
The template will then expect the source code to be located in the solutions-[region_name] bucket

## CF template and Lambda function
Located in deployment/dist

```
deployment/dist/
├── [2.0M]  serverless-image-handler-custom-resource.zip
├── [6.4M]  serverless-image-handler-ui.zip
├── [ 23K]  serverless-image-handler.template
└── [ 48M]  serverless-image-handler.zip
```

***

Copyright 2017 Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Amazon Software License (the "License"). You may not use this file except in compliance with the License. A copy of the License is located at

    http://aws.amazon.com/asl/

or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions and limitations under the License.

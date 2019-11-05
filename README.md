
**_Important Notice:_**
Due to a [change in the AWS Lambda execution environment](https://aws.amazon.com/blogs/compute/upcoming-updates-to-the-aws-lambda-execution-environment/), Serverless Image Handler v3 deployments are functionally broken. To address the issue we have released [minor version update v3.1.1](https://solutions-reference.s3.amazonaws.com/serverless-image-handler/v3.1.1/serverless-image-handler.template). We recommend all users of v3 to run cloudformation stack update with v3.1.1. Additionally, we suggest you to look at v4 of the solution and migrate to v4 if it addresses all of your use cases. 

# AWS Serverless Image Handler Lambda wrapper for SharpJS
A solution to dynamically handle images on the fly, utilizing Sharp (https://sharp.pixelplumbing.com/en/stable/).
Published version, additional details and documentation are available here: https://aws.amazon.com/solutions/serverless-image-handler/

**Note:** it is recommend to build the application binary on Amazon Linux.

## Installation without customization

Follow the CloudFormation deployment [instructions](#deploy-cloudformation). However, instead of uploading the code to Amazon S3 buckets yourself, use the following template URL: 

```
https://s3.amazonaws.com/solutions-reference/serverless-image-handler/latest/serverless-image-handler.template
```

See also: https://aws.amazon.com/solutions/serverless-image-handler/

## Prerequisites - custom build

For a custom deployment you'll have to create two Amazon S3 buckets: One bucket will contain the CloudFormation template. Another regional bucket  will host the code distributable. If your first bucket is named `my-bucket-name` name the second: `my-bucket-name-[aws_region]`. 
**Note:** `[aws_region]` is the region where you are deploying the customized solution, for example: us-east-1. Make sure the assets in the buckets are publicly accessible.

To serve the images another Amazon S3  bucket is necessary. Make sure that the `Block public access` setting under `Permissions` is set to Off. **Note:** if you are using Thumbor requests the images need to be in the root of the bucket otherwise they cannot be accessed.

To deploy the code distributable has to be uploaded to the deployment buckets. It is recommended to have the AWS Command Line Interface installed to do this.

# Installation

### Building customized distributable

* Clone the github repo
```bash
git clone https://github.com/awslabs/serverless-image-handler.git
```

* Navigate to the deployment folder
```bash
cd serverless-image-handler/deployment
```

* Configure the bucket name of your Amazon S3 distribution bucket
```bash
# bucket where cfn template will reside
export TEMPLATE_OUTPUT_BUCKET=my-bucket-name
# bucket where customized code will reside
export DIST_OUTPUT_BUCKET=my-bucket-name
# version number for the customized code
export VERSION=my-version
```

* Now build the distributable
```bash
sudo ./build-s3-dist.sh $DIST_OUTPUT_BUCKET $VERSION
```

* Deploy the distributable to an Amazon S3 bucket in your account. 
**Note:** this requires the AWS Command Line Interface. If you do not have this installed, manually upload the template and zip files to the correct destination in your Amazon S3 buckets.
```bash
aws s3 cp ./dist/ s3://$DIST_OUTPUT_BUCKET-[region_name]/serverless-image-handler/$VERSION/ --recursive --exclude "*" --include "*.zip"
aws s3 cp ./dist/serverless-image-handler.template s3://$TEMPLATE_OUTPUT_BUCKET/serverless-image-handler/$VERSION/
```

### Deploy cloudFormation
After building the code distributable and uploading it to the correct Amazon S3 buckets do the following:
* Get the link of the serverless-image-handler.template uploaded to your Amazon S3 bucket (i.e., `my-bucket-name`)

```
https://s3.amazonaws.com/[my-bucket-name]/serverless-image-handler/[my-version]/serverless-image-handler.template
```

* Deploy the Serverless Image Handler solution by launching a new AWS CloudFormation stack using the template link. Wait a couple of minutes for all the components to be prepared and go to the [CloudFormation console](https://console.aws.amazon.com/cloudformation) to fetch your API endpoint under the `Outputs` tab.
* Done!

### Update lambda function
If you've already deployed the template and just want to update the Lambda function code do the following:
* Go to the Lambda Management Console
* Under `Function code`, select `upload a file from Amazon S3` as `Code entry type`
* Enter the link of the image-handler.zip distribution

```
https://s3.amazonaws.com/[my-bucket-name-<aws_region>]/serverless-image-handler/[my-version]/image-handler.zip
```

* Hit `Save` up top and then under `Actions` select `Publish new version`
* Done!

## Running unit tests
* Clone the repository and make the desired code changes
* Next, run unit tests to make sure that the added customization passes the tests

```bash
cd ./deployment
chmod +x ./run-unit-tests.sh
./run-unit-tests.sh
```

* Test your code by deploying the CloudFormation stack, see [installation notes](#installation).

# Basic usage
After creating the CloudFormation stack the image handler has multiple request types: [Sharp](#sharp), [Thumbor](#thumbor), and [Custom](#custom).

### Sharp
* The sharp endpoint accepts base64 encoded JSON objects describing Sharp functions, check the [documentation](https://sharp.pixelplumbing.com/en/stable/) for valid functions
* Build the url by defining a JSON object of the required edits

```javascript
const request = {
  "bucket": "my-bucket",
  "key": "some-img.jpg",
  "edits": {
    "resize": {
      "width": 200,
      "height": 200
    }
  }
}
```

* Encode the object in base64

```javascript
const jsonString = JSON.stringify(request)
const request = btoa(jsonString)

console.log(request)

// Result: eyJidWNrZXQiOiJteS1idWNrZXQiLCAia2V5Ijoic29tZS1pbWcuanBnIiwgImVkaXRzIjogeyJyZXNpemUiOiB7IndpZHRoIjogMzAwLCAiaGVpZ2h0IjogMzAwIH19fQ==
```

* Now use the base64 encoded string to access the image!

```
https://[my-cloud-front].cloudfront.net/eyJidWNrZXQiOiJteS1idWNrZXQiLCAia2V5Ijoic29tZS1pbWcuanBnIiwgImVkaXRzIjogeyJyZXNpemUiOiB7IndpZHRoIjogMzAwLCAiaGVpZ2h0IjogMzAwIH19fQ==
```

**Note:** a valid request matches the following regex: 

```
/^(\/?)([0-9a-zA-Z+\/]{4})*(([0-9a-zA-Z+\/]{2}==)|([0-9a-zA-Z+\/]{3}=))?$/
```

### Thumbor

* Use a valid Thumbor url, check the [documentation](https://thumbor.readthedocs.io/en/latest/index.html) for available actions

```
https://[my-cloud-front].cloudfront.net/300x200/smart/some-img.jpg
```

**Note:** a valid request matches the following regex:

```
/^(\/?)((fit-in)?|(filters:.+\(.?\))?|(unsafe)?).*(.+jpg|.+png|.+webp|.+tiff|.+jpeg)$/
```

**Note:** images have to be in the root of your Amazon S3 bucket otherwise they cannot be accessed using Thumbor requests.
**Note:** while a sharp request may serve from any bucket defined in the ```SOURCE_BUCKETS``` parameter Thumbor will only serve from the first bucket in the list.

### Custom

This option will run the request through the same mapping as thumbor requests. However, before doing this a pattern replace is performed. You can define the pattern and substitution in the environment variables: `REWRITE_MATCH_PATTERN` and `REWRITE_SUBSTITUTION`. You can find these in the serverless-image-handler.template [here](deployment/serverless-image-handler.template#L237).

**Note:** a valid request matches the following regex:
```
/(\/?)(.*)(jpg|png|webp|tiff|jpeg)/
```

---
Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Amazon Software License (the "License"). You may not use this file except in compliance with the License. A copy of the License is located at

    http://aws.amazon.com/asl/

or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions and limitations under the License.

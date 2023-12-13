# Serverless Image Handler Readme

The serverless-image-handler mono repository contains the source code and documentation for the [image-handler](#image-handler) and [image-thumbs](#image-thumbs) AWS Lambda functions.

## Table of Contents

- [Serverless Image Handler Readme](#serverless-image-handler-readme)
- [Table of Contents](#table-of-contents)
- [Architecture](#architecture)
- [Image Handler](#image-handler)
    - [Overview](#overview)
    - [Prerequisites](#prerequisites)
    - [Usage](#usage)
    - [Building](#building)
    - [Testing](#testing)
    - [Infrastructure deployment](#infrastructure-deployment)
- [Image Thumbs](#image-thumbs)
    - [Overview](#overview-1)
    - [Prerequisites](#prerequisites-1)
    - [Building](#building-1)
    - [Test / Invoke](#test--invoke)
    - [Infrastructure deployment](#infrastructure-deployment-1)

### Architecture

![Architecture](architecture.png)

## Image Handler

### Overview

The Image-handler is a solution Image Handler is a serverless image processing project built with Node.js 18 and the [Sharp](https://sharp.pixelplumbing.com/en/stable/) library. 
It allows you to dynamically scale images on the fly and serves them through AWS Lambda, AWS CloudFront, and AWS S3.

It aws originally forked from [aws-solutions/serverless-image-handler repository](https://github.com/aws-solutions/serverless-image-handler), but has been heavily modified to suit our needs.

### Prerequisites

- [Node.js](https://nodejs.org/en/) v18.x or later
- [Terraform](https://www.terraform.io/downloads.html)
- Make
- AWS credentials with sufficient permissions

### Usage

To scale images dynamically on the fly, you can make HTTP requests to the AWS CloudFront distribution URL. 
The images are fetched from AWS S3, processed using Node.js 18 and Sharp, and then served through CloudFront.

Example URL:

```https://images.t-online.de/4k_hdr.jpg```

For more details see the [Usage](docs/Usage.md) documentation.

### Environment variables

The following environment variables are used by the image-handler:

| Name                      | Description                                     |
|---------------------------|-------------------------------------------------|
| `AUTO_WEBP`               | Flag if the AUTO WEBP feature should be enabled |
| `CORS_ENABLED`            | Flag if CORS should be enabled                  |
| `CORS_ORIGIN`             | CORS origin.                                    |
| `LOG_EXT_OPEN_SEARCH_URL` | URL of OpenSearch                               |
| `SOURCE_BUCKETS`          | S3 Bucket with source images                    |

### Building

To build the package run:

```make build```

### Testing

Run tests using the following Make command:

```make npm/test```

### Infrastructure deployment

Deploy the infrastructure using Terraform with the following Make command:

```make tf```

## Image Thumbs

### Overview

Image-thumbs is an implementation of [thumbhash](https://evanw.github.io/thumbhash/) as a Rust AWS Lambda function URL providing a very compact representation of a placeholder for an image.

### Prerequisites

- [Rust](https://www.rust-lang.org/tools/install)

### Building

To build the package run:

```make SERVICE=thumbs build```

### Test / Invoke

See [cargo lambda](https://www.cargo-lambda.info/guide/getting-started.html)

```bash
# Terminal 1
cargo lambda watch
# Terminal 2
cargo lambda invoke --data-file apigw-request.json
```

## Infrastructure deployment

To deploy the infrastructure run:

```make SERVICE=thumb tf```

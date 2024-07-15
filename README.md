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

- [Node.js](https://nodejs.org/en/) v20.x or later
- [Terraform](https://www.terraform.io/downloads.html)
- Make / npm
- AWS credentials with sufficient permissions to read images from S3

### Usage

To scale images dynamically on the fly, you can make HTTP requests to the AWS CloudFront distribution URL. 
The images are fetched from AWS S3, processed using Node.js 20 and Sharp / libvips, and then served through CloudFront.

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
| `SOURCE_BUCKETS`          | S3 Bucket with source images                    |

### Building

To build the package run:

```make FUNC=image-handler build```

### Testing

Run tests using the following Make command:

```make npm/test```

### Infrastructure deployment

Deploy the infrastructure using Terraform with the following Make command:

```make FUNC=image-handler tf```

## Special interest section

Useful links:

* Image too large with default settings: `2023/02/JPCPt616git7/image.png`
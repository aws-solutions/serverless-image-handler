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

## Ströer specific adaptations

### The file name does not matter

The way we process our images does not depend on the file name. The part that copies the images from 
the CMS into our delivery bucket will rename all images to `image.${extension}`.

When rendering the image, the image-handler will always look for this filename, so it does not matter
what the original file name was. e.g. 

- `2023/02/JPCPt616git7/seo-title.png` will be served as `image.png`
- `2023/02/JPCPt616git7/other-usage-different-title.png` will be served as `image.png`

resulting in the same response.

### Cropping coordinates format

- the original solution introduced thumbor cropping in [v6](https://github.com/aws-solutions/serverless-image-handler/commit/76558b787b9417450ee4a4f19dc9548be6dbada7)
- we have implemented this feature in advance, but with a slightly different syntax:
  - The original solution uses `crop=left,top,right,bottom`
  - We use `crop=left,top,width,height` to be more consistent with the CMS

### Expired Content

- The original solution uses the `Expires` header to cache images in the browser
- Our solution:
  - reduces the `Cache-Control: max-age` according to the `Expires` header to handle expired content
  - Also, once the Expires header is reached, the image-handler will return a `http/410 (GONE)` status code 

### Additional filter: thumbhash

- `/filters:thumbhash()/` will trigger a hash-based thumbnail generation. See https://evanw.github.io/thumbhash/
- The image can be cropped prior to this filter, but will ultimately be resized to `100x100` pixel to generate an efficient thumbnail
- The response will be `base64` encoded binary that can be converted via `Thumbhash.thumbHashToDataURL()`

### Next data workaround

Within the HTML markup resides the `next-data` [attribute](https://github.com/vercel/next.js/discussions/15117)

Within this data structure there are some image URLs that are not directly intended to be rendered. Consider 
them as templates. 
Google (and other bots) will find and use this URL nonetheless. This image-handler will replace all calls that
contain template variables `/__WIDTH__x0/` with an actual size to mitigate this.

### Removal of features not required

If required once more, they need to be pulled from the original repository:

- Recognition and the corresponding code:
  - "Smart Crop" (aka face recognition)
  - Content Moderation (e.g. NSFW detection)
- Watermarking/Overlaying
- Secretsmanager and URL signing
- Dynamic S3 bucket selection
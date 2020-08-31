# Change Log
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [5.0] - 2020-08-31
### Added
- AWS CDK and AWS Solutions Constructs to create AWS CloudFormation template

### Fixed
- Auto WebP does not work properly: [#195](https://github.com/awslabs/serverless-image-handler/pull/195), [#200](https://github.com/awslabs/serverless-image-handler/issues/200), [#205](https://github.com/awslabs/serverless-image-handler/issues/205)
- A bug where base64 encoding containing slash: [#194](https://github.com/awslabs/serverless-image-handler/pull/194)
- Thumbor issues:
  - `0` size support: [#183](https://github.com/awslabs/serverless-image-handler/issues/183)
  - `convolution` filter does not work: [#187](https://github.com/awslabs/serverless-image-handler/issues/187)
  - `fill` filter does not work: [#190](https://github.com/awslabs/serverless-image-handler/issues/190)
- __Note that__ duplicated features has been merged gracefully.

### Removed
- AWS CloudFormation template: `serverless-image-handler.template`

### Changed
- sharp base version (from 0.23.4 to 0.25.4)
- Remove `Promise` to return since `async` functions return promises: [#189](https://github.com/awslabs/serverless-image-handler/issues/189)
- Unit test statement coverage improvement:
  - `image-handler.js`: `79.05%` to `100%`
  - `image-request.js`: `93.58%` to `100%`
  - `thumbor-mapping.js`: `99.29%` to `100%`
  - `overall`: `91.55%` to `100%`

## [4.2] - 2020-02-06
### Added
- Honor outputFormat Parameter from the pull request [#117](https://github.com/awslabs/serverless-image-handler/pull/117)
- Support serving images under s3 subdirectories, Fix to make /fit-in/ work; Fix for VipsJpeg: Invalid SOS error plus several other critical fixes from the pull request [#130](https://github.com/awslabs/serverless-image-handler/pull/130)
- Allow regex in SOURCE_BUCKETS for environment variable from the pull request [#138](https://github.com/awslabs/serverless-image-handler/pull/138)
- Fix build script on other platforms from the pull request [#139](https://github.com/awslabs/serverless-image-handler/pull/139)
- Add Cache-Control response header from the pull request [#151](https://github.com/awslabs/serverless-image-handler/pull/151)
- Add AUTO_WEBP option to automatically serve WebP if the client supports it from the pull request [#152](https://github.com/awslabs/serverless-image-handler/pull/152)
- Use HTTP 404 & forward Cache-Control, Content-Type, Expires, and Last-Modified headers from S3 from the pull request [#158](https://github.com/awslabs/serverless-image-handler/pull/158)
- fix: DeprecationWarning: Buffer() is deprecated from the pull request [#174](https://github.com/awslabs/serverless-image-handler/pull/174)
- Add hex color support for Thumbor ```filters:background_color``` and ```filters:fill``` [#154](https://github.com/awslabs/serverless-image-handler/issues/154)
- Add format and watermark support for Thumbor [#109](https://github.com/awslabs/serverless-image-handler/issues/109), [#131](https://github.com/awslabs/serverless-image-handler/issues/131), [#109](https://github.com/awslabs/serverless-image-handler/issues/142)
- __Note that__ duplicated features has been merged gracefully.

### Changed
- sharp base version (from 0.23.3 to 0.23.4)
- Image handler Amazon CloudFront distribution ```DefaultCacheBehavior.ForwaredValues.Header``` to ```["Origin", "Accept"]``` for webp
- Image resize process change for ```filters:no_upscale()``` handling by ```withoutEnlargement``` edit key [#144](https://github.com/awslabs/serverless-image-handler/issues/144)

### Fixed
- Add and fix Cache-control, Content-Type, Expires, and Last-Modified headers to response: [#103](https://github.com/awslabs/serverless-image-handler/issues/103), [#107](https://github.com/awslabs/serverless-image-handler/issues/107), [#120](https://github.com/awslabs/serverless-image-handler/issues/120)
- Fix Amazon S3 bucket subfolder issue: [#106](https://github.com/awslabs/serverless-image-handler/issues/106), [#112](https://github.com/awslabs/serverless-image-handler/issues/112), [#119](https://github.com/awslabs/serverless-image-handler/issues/119), [#123](https://github.com/awslabs/serverless-image-handler/issues/123), [#167](https://github.com/awslabs/serverless-image-handler/issues/167), [#175](https://github.com/awslabs/serverless-image-handler/issues/175)
- Fix HTTP status code for missing images from 500 to 404: [#159](https://github.com/awslabs/serverless-image-handler/issues/159)
- Fix European character in filename issue: [#149](https://github.com/awslabs/serverless-image-handler/issues/149)
- Fix image scaling issue for filename containing 'x' character: [#163](https://github.com/awslabs/serverless-image-handler/issues/163), [#176](https://github.com/awslabs/serverless-image-handler/issues/176)
- Fix regular expression issue: [#114](https://github.com/awslabs/serverless-image-handler/issues/114), [#121](https://github.com/awslabs/serverless-image-handler/issues/121), [#125](https://github.com/awslabs/serverless-image-handler/issues/125)
- Fix not working quality parameter: [#129](https://github.com/awslabs/serverless-image-handler/issues/129)

## [4.1] - 2019-12-31
### Added
- CHANGELOG file
- Access logging to API Gateway

### Changed
- Lambda functions runtime to nodejs12.x
- sharp version (from 0.21.3 to 0.23.3)
- Image handler function to use Composite API (https://sharp.pixelplumbing.com/en/stable/api-composite/)
- License to Apache-2.0

### Removed
- Reference to deprecated sharp function (overlayWith)
- Capability to resize images proportionally if width or height is set to 0 (sharp v0.23.1 and later check that the width and height - if present - are positive integers)

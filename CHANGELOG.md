# Change Log
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [5.2.0] - 2021-01-29
### Added
- Support for ap-east-1 and me-south-1 regions: [#192](https://github.com/awslabs/serverless-image-handler/issues/192), [#228](https://github.com/awslabs/serverless-image-handler/issues/228), [#232](https://github.com/awslabs/serverless-image-handler/issues/232)
- Unit tests for custom-resource: `100%` coverage
- Cloudfront cache policy and origin request policy: [#229](https://github.com/awslabs/serverless-image-handler/issues/229)
- Circular cropping feature: [#214](https://github.com/awslabs/serverless-image-handler/issues/214), [#216](https://github.com/awslabs/serverless-image-handler/issues/216)
- Unit tests for image-handler: `100%` coverage
- Support for files without extension on thumbor requests: [#169](https://github.com/awslabs/serverless-image-handler/issues/169), [#188](https://github.com/awslabs/serverless-image-handler/issues/188)
- Inappropriate content detection feature: [#243](https://github.com/awslabs/serverless-image-handler/issues/243)
- Unit tests for image-request: `100%` coverage

### Fixed
- Graceful failure when no faces are detected using smartCrop and fail on resizing before smartCrop: [#132](https://github.com/awslabs/serverless-image-handler/issues/132), [#133](https://github.com/awslabs/serverless-image-handler/issues/133)
- Broken SVG returned if no edits specified and Auto-WebP enabled: [#247](https://github.com/awslabs/serverless-image-handler/issues/247)
- Removed "--recursive" from README.md: [#255](https://github.com/awslabs/serverless-image-handler/pull/255)
- fixed issue with failure on resize if width or height is float: [#254](https://github.com/awslabs/serverless-image-handler/issues/254)

### Changed 
- Constructs test template for constructs unit test: `100%` coverage

## [5.1.0] - 2020-11-19
### ⚠ BREAKING CHANGES
- **Image URL Signature**: When image URL signature is enabled, all URLs including existing URLs should have `signature` query parameter.

### Added
- Image URL signature: [#111](https://github.com/awslabs/serverless-image-handler/issues/111), [#203](https://github.com/awslabs/serverless-image-handler/issues/203), [#221](https://github.com/awslabs/serverless-image-handler/issues/221), [#227](https://github.com/awslabs/serverless-image-handler/pull/227)
- AWS Lambda `413` error handling. When the response payload is bigger than 6MB, it throws `TooLargeImageException`: [#35](https://github.com/awslabs/serverless-image-handler/issues/35), [#97](https://github.com/awslabs/serverless-image-handler/issues/97), [#193](https://github.com/awslabs/serverless-image-handler/issues/193), [#204](https://github.com/awslabs/serverless-image-handler/issues/204)
- Default fallback image: [#137](https://github.com/awslabs/serverless-image-handler/issues/137)
- Unit tests for custom resource: `100%` coverage
- Add `SVG` support. When any edits are used, the output would be automatically `PNG` unless the output format is specified: [#31](https://github.com/awslabs/serverless-image-handler/issues/31), [#234](https://github.com/awslabs/serverless-image-handler/issues/234)
- Custom headers: [#182](https://github.com/awslabs/serverless-image-handler/pull/182)
- Enabling ALB Support : [#201](https://github.com/awslabs/serverless-image-handler/pull/201)

### Fixed
- Thumbor paths broken if they include "-" and "100x100": [#208](https://github.com/awslabs/serverless-image-handler/issues/208)
- Rewrite doesn't seem to be working: [#121](https://github.com/awslabs/serverless-image-handler/issues/121)
- Correct EXIF: [#197](https://github.com/awslabs/serverless-image-handler/issues/197), [#220](https://github.com/awslabs/serverless-image-handler/issues/220), [#235](https://github.com/awslabs/serverless-image-handler/issues/235), [#236](https://github.com/awslabs/serverless-image-handler/issues/236), [#240](https://github.com/awslabs/serverless-image-handler/issues/240)
- Sub folder support in Thumbor `watermark` filter: [#231](https://github.com/awslabs/serverless-image-handler/issues/231)

### Changed
- AWS CDK and AWS Solutions Constructs version (from 1.57.0 to 1.64.1)
- sharp base version (from 0.25.4 to 0.26.1)
- Refactors the custom resource Lambda source code
- Migrate unit tests to use `jest`
- Move all `aws-sdk` in `ImageHandler` Labmda function to `index.js` for the best practice
- Enhance the default error message not to show empty JSON: [#206](https://github.com/awslabs/serverless-image-handler/issues/206)

### Removed
- Remove `manifest-generator`

## [5.0.0] - 2020-08-31
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

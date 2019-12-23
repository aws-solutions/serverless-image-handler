# Change Log
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [4.1] - 2019-12-31
### Added
- CHANGELOG file
- Access logging to API Gateway

### Changed
- Lambda functions runtime to nodejs12.x
- sharp version (from 0.21.3 to 0.23.3)
- Image handler function to use Composite API (https://sharp.pixelplumbing.com/en/stable/api-composite/)
- License to Apache-2.0

# Removed
- Reference to deprecated sharp function (overlayWith)

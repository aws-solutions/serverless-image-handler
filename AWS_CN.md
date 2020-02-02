# Deployment Guide for AWS China Region

This branch is aiming to add support for AWS China regions. 

1. [Launch solution in the AWS (China) Console](https://cn-northwest-1.console.amazonaws.cn/cloudformation/home?region=cn-northwest-1#/stacks/create/template?stackName=ServerlessImageHandler&templateURL=https:%2F%2Faws-solutions-reference.s3.cn-north-1.amazonaws.com.cn%2Fserverless-image-handler%2Flatest%2Fserverless-image-handler.template)
1. If you want to deploy a Demo UI, select `Yes` for **CorsEnabled**
1. Associate a **CNAME** to CloudFront Distributions in [AWS CloudFront Console](https://cn-northwest-1.console.amazonaws.cn/cloudfront/home)
1. Associate **SSL Certificate** to the CloudFront Distributions
1. Create a **CNAME record** in your DNS resolver and point to the CloudFront domain.

## TODOs
- [x] Image Handler China Region Support
- [x] Demo UI China Region Support
- [x] Create issue on [GitHub issues](https://github.com/awslabs/serverless-image-handler/issues)
- [ ] Update Documentation for China Region
- [ ] Create PR to [awslabs/serverless-image-handler](https://github.com/awslabs/serverless-image-handler)
- [ ] Website configuration for S3 is not needed 

## Notice

- The Demo UI will use the API Gateway endpoint, because the default CloudFront domain is disabled in China region

## Difference in China Region

- Default CloudFront domain cannot be used. Must associate a CNAME record to the CloudFront Distribution. The domain name must have an ICP record.
- The ARN starts with `arn:aws-cn`.
- Service endpoint is `amazonaws.com.cn`
- The API Gateway does not support `EDGE` endpoint type
- S3 does not have `DomainName` attribute, it only has `RegionalDomainName` attribute
- CloudFront does not have **OriginAccessIdentity** feature
- S3 cannot be used for web hosting
- CloudFront IPv6 is not available
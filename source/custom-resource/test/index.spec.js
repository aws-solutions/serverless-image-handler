// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

// Import packages
const axios = require('axios');
const MockAdapter = require('axios-mock-adapter');
const axiosMock = new MockAdapter(axios);

// System environment variables
process.env.AWS_REGION = 'test-region';
process.env.RETRY_SECONDS = 0.01;

// Mock UUID
jest.mock('uuid', () => {
  return {
    v4: jest.fn(() => 'mock-uuid')
  };
});

// Mock data
const now = new Date();
global.Date = jest.fn(() => now);
global.Date.getTime = now.getTime();

// Mock axios
axiosMock.onPut('/cfn-response').reply(200);

// Mock context
const context = {
  logStreamName: 'log-stream'
};

// Mock AWS SDK
const mockS3 = jest.fn();
const mockSecretsManager = jest.fn();
jest.mock('aws-sdk', () => {
  return {
    S3: jest.fn(() => ({
      getObject: mockS3,
      copyObject: mockS3,
      putObject: mockS3,
      headBucket: mockS3,
      headObject: mockS3,
      createBucket: mockS3,
      putBucketEncryption: mockS3,
      putBucketPolicy: mockS3,
      waitFor: mockS3
    })),
    SecretsManager: jest.fn(() => ({
      getSecretValue: mockSecretsManager
    }))
  };
});

const mockConfig = `'use strict';

const appVariables = {
someKey: 'someValue'
};`;

// Import index.js
const index = require('../index.js');

describe('index', function() {
  describe('sendMetric', function() {
    // Mock event data
    const event = {
      "RequestType": "Create",
      "ResponseURL": "/cfn-response",
      "ResourceProperties": {
        "customAction": "sendMetric",
        "anonymousData": "Yes",
        "Region": "test-region",
        "solutionId": "solution-id",
        "UUID": "mock-uuid",
        "version": "test-version",
        "enableSignature": "Yes",
        "enableDefaultFallbackImage": "Yes"
      }
    };

    it('should return success when sending anonymous metric succeeds', async function() {
      // Mock axios
      axiosMock.onPost('https://metrics.awssolutionsbuilder.com/generic').reply(200);

      const result = await index.handler(event, context);
      expect(result).toEqual({
        status: 'SUCCESS',
        data: {
          Message: 'Anonymous data was sent successfully.',
          Data: {
            Solution: 'solution-id',
            TimeStamp: `${now.toISOString().replace(/T/, ' ')}`,
            UUID: 'mock-uuid',
            Version: 'test-version',
            Data: {
              Region: 'test-region',
              Type: 'Create',
              EnableSignature: 'Yes',
              EnableDefaultFallbackImage: 'Yes'
            }
          }
        }
      });
    });
    it('should return success when sending anonymous usage fails', async function() {
      // Mock axios
      axiosMock.onPost('https://metrics.awssolutionsbuilder.com/generic').reply(500);

      const result = await index.handler(event, context);
      expect(result).toEqual({
        status: 'SUCCESS',
        data: {
          Message: 'Anonymous data was sent failed.',
          Data: {
            Solution: 'solution-id',
            TimeStamp: `${now.toISOString().replace(/T/, ' ')}`,
            UUID: 'mock-uuid',
            Version: 'test-version',
            Data: {
              Region: 'test-region',
              Type: 'Create',
              EnableSignature: 'Yes',
              EnableDefaultFallbackImage: 'Yes'
            }
          }
        }
      });
    });
    it('should not send annonymous metric when anonymouseData is "No"', async function() {
      event.ResourceProperties.anonymousData = 'No';

      const result = await index.handler(event, context);
      expect(result).toEqual({
        status: 'SUCCESS',
        data: {}
      });
    });
  });

  describe('putConfigFile', function() {
    // Mock event data
    const event = {
      "RequestType": "Create",
      "ResponseURL": "/cfn-response",
      "ResourceProperties": {
        "customAction": "putConfigFile",
        "configItem": {
          "someKey": "someValue"
        },
        "destS3Bucket": "destination-bucket",
        "destS3key": "demo-ui-config.js"
      }
    };

    beforeEach(() => {
      mockS3.mockReset();
    });

    it('should return success to put config file', async function() {
      mockS3.mockImplementation(() => {
        return {
          promise() {
            // s3:PutObject
            return Promise.resolve();
          }
        };
      });

      const result = await index.handler(event, context);
      expect(mockS3).toHaveBeenCalledWith({
        Bucket: event.ResourceProperties.destS3Bucket,
        Body: mockConfig,
        Key: event.ResourceProperties.destS3key,
        ContentType: 'application/javascript'
      });
      expect(result).toEqual({
        status: 'SUCCESS',
        data: {
          Message: 'Config file uploaded.',
          Content: mockConfig
        }
      });
    });
    it('should return failed when PutObject fails', async function() {
      mockS3.mockImplementation(() => {
        return {
          promise() {
            // s3:PutObject
            return Promise.reject({ message: 'PutObject failed.' });
          }
        };
      });

      const result = await index.handler(event, context);
      expect(mockS3).toHaveBeenCalledWith({
        Bucket: event.ResourceProperties.destS3Bucket,
        Body: mockConfig,
        Key: event.ResourceProperties.destS3key,
        ContentType: 'application/javascript'
      });
      expect(result).toEqual({
        status: 'FAILED',
        data: {
          Error: {
            code: 'ConfigFileCreationFailure',
            message: `Saving config file to ${event.ResourceProperties.destS3Bucket}/${event.ResourceProperties.destS3key} failed.`
          }
        }
      });
    });
    it('should retry and return success when IAM policy is not so S3 API returns AccessDenied', async function() {
      mockS3.mockImplementationOnce(() => {
        return {
          promise() {
            // s3:PutObject
            return Promise.reject({ code: 'AccessDenied' });
          }
        };
      }).mockImplementationOnce(() => {
        return {
          promise() {
            // s3:PutObject
            return Promise.resolve();
          }
        };
      });

      const result = await index.handler(event, context);
      expect(mockS3).toHaveBeenCalledWith({
        Bucket: event.ResourceProperties.destS3Bucket,
        Body: mockConfig,
        Key: event.ResourceProperties.destS3key,
        ContentType: 'application/javascript'
      });
      expect(result).toEqual({
        status: 'SUCCESS',
        data: {
          Message: 'Config file uploaded.',
          Content: mockConfig
        }
      });
    });
  });

  describe('copyS3assets', function() {
    // Mock event data
    const event = {
      "RequestType": "Create",
      "ResponseURL": "/cfn-response",
      "ResourceProperties": {
        "customAction": "copyS3assets",
        "manifestKey": "manifest.json",
        "sourceS3Bucket": "source-bucket",
        "sourceS3key": "source-key",
        "destS3Bucket": "destination-bucket"
      }
    };
    const manifest = {
      files: [
        'index.html',
        'scripts.js',
        'style.css',
        'image.png',
        'image.jpg',
        'image.svg',
        'text.txt'
      ]
    };

    beforeEach(() => {
      mockS3.mockReset();
    });

    it('should return success to copy S3 assets', async function() {
      mockS3.mockImplementationOnce(() => {
        return {
          promise() {
            // s3:GetObject
            return Promise.resolve(
              {
                Body: JSON.stringify(manifest)
              }
            );
          }
        };
      }).mockImplementation(() => {
        return {
          promise() {
            // s3:CopyObject
            return Promise.resolve({ CopyObjectResult: 'Success' });
          }
        };
      });

      const result = await index.handler(event, context);
      expect(result).toEqual({
        status: 'SUCCESS',
        data: {
          Message: 'Copy assets completed.',
          Manifest: manifest
        }
      });
    });
    it('should return failed when getting manifest fails', async function() {
      mockS3.mockImplementation(() => {
        return {
          promise() {
            // s3:GetObject
            return Promise.reject({ message: 'GetObject failed.' });
          }
        };
      });

      const result = await index.handler(event, context);
      expect(result).toEqual({
        status: 'FAILED',
        data: {
          Error: {
            code: 'GetManifestFailure',
            message: 'Copy of website assets failed.'
          }
        }
      });
    });
    it('should return failed when copying assets fails', async function() {
      mockS3.mockImplementationOnce(() => {
        return {
          promise() {
            // s3:GetObject
            return Promise.resolve({ Body: JSON.stringify(manifest) });
          }
        };
      }).mockImplementation(() => {
        return {
          promise() {
            // s3:CopyObject
            return Promise.reject({ message: 'CopyObject failed.' });
          }
        };
      });

      const result = await index.handler(event, context);
      expect(result).toEqual({
        status: 'FAILED',
        data: {
          Error: {
            code: 'CopyAssetsFailure',
            message: 'Copy of website assets failed.'
          }
        }
      });
    });
    it('should retry and return success IAM policy is not ready so S3 API returns AccessDenied', async function() {
      mockS3.mockImplementationOnce(() => {
        return {
          promise() {
            // s3:GetObject
            return Promise.reject({ code: 'AccessDenied' });
          }
        };
      }).mockImplementationOnce(() => {
        return {
          promise() {
            // s3:GetObject
            return Promise.resolve({ Body: JSON.stringify(manifest) });
          }
        };
      }).mockImplementation(() => {
        return {
          promise() {
            // s3:CopyObject
            return Promise.resolve({ CopyObjectResult: 'Success' });
          }
        };
      });

      const result = await index.handler(event, context);
      expect(result).toEqual({
        status: 'SUCCESS',
        data: {
          Message: 'Copy assets completed.',
          Manifest: manifest
        }
      });
    });
  });

  describe('createUuid', function() {
    // Mock event data
    const event = {
      "RequestType": "Create",
      "ResponseURL": "/cfn-response",
      "ResourceProperties": {
        "customAction": "createUuid"
      }
    };

    it('should return uuid', async function() {
      const result = await index.handler(event, context);
      expect(result).toEqual({
        status: 'SUCCESS',
        data: { UUID: 'mock-uuid' }
      });
    });
  });

  describe('checkSourceBuckets', function() {
    const buckets = 'bucket-a, bucket-b, bucket-c'

    // Mock event data
    const event = {
      "RequestType": "Create",
      "ResponseURL": "/cfn-response",
      "ResourceProperties": {
        "customAction": "checkSourceBuckets",
        "sourceBuckets": buckets
      }
    };

    beforeEach(() => {
      mockS3.mockReset();
    });

    it('should return success to check source buckets', async function() {
      mockS3.mockImplementation(() => {
        return {
          promise() {
            // s3:HeadBucket
            return Promise.resolve();
          }
        };
      });

      const result = await index.handler(event, context);
      expect(result).toEqual({
        status: 'SUCCESS',
        data: { Message: 'Buckets validated.' }
      });
    });
    it('should return failed when any buckets do not exist', async function() {
      mockS3.mockImplementation(() => {
        return {
          promise() {
            // s3:HeadBucket
            return Promise.reject({ message: 'HeadObject failed.' });
          }
        };
      });

      const errorBuckets = buckets.replace(/\s/g, '').split(',');
      const result = await index.handler(event, context);
      expect(result).toEqual({
        status: 'FAILED',
        data: {
          Error: {
            code: 'BucketNotFound',
            message: `Could not find the following source bucket(s) in your account: ${errorBuckets.join(',')}. Please specify at least one source bucket that exists within your account and try again. If specifying multiple source buckets, please ensure that they are comma-separated.`
          }
        }
      });
    });
  });

  describe('checkSecretsManager', function() {
    // Mock event data
    const event = {
      "RequestType": "Create",
      "ResponseURL": "/cfn-response",
      "ResourceProperties": {
        "customAction": "checkSecretsManager",
        "secretsManagerName": "secrets-manager-name",
        "secretsManagerKey": "secrets-manager-key"
      }
    };
    const secret = {
      SecretString: '{"secrets-manager-key":"secret-ingredient"}',
      ARN: 'arn:of:secrets:managers:secret'
    };

    beforeEach(() => {
      mockSecretsManager.mockReset();
    });

    it('should return success when secrets manager secret and secret\'s key exists', async function() {
      mockSecretsManager.mockImplementation(() => {
        return {
          promise() {
            // secretsManager:GetSecretValue
            return Promise.resolve(secret);
          }
        };
      });

      const result = await index.handler(event, context);
      expect(result).toEqual({
        status: 'SUCCESS',
        data: {
          Message: 'Secrets Manager validated.',
          ARN: secret.ARN
        }
      });
    });
    it('should return failed when secretName is not provided', async function() {
      event.ResourceProperties.secretsManagerName = '';

      const result = await index.handler(event, context);
      expect(result).toEqual({
        status: 'FAILED',
        data: {
          Error: {
            code: 'SecretNotProvided',
            message: 'You need to provide AWS Secrets Manager secert.'
          }
        }
      });
    });
    it('should return failed when secretKey is not provided', async function() {
      event.ResourceProperties.secretsManagerName = 'secrets-manager-name';
      event.ResourceProperties.secretsManagerKey = '';

      const result = await index.handler(event, context);
      expect(result).toEqual({
        status: 'FAILED',
        data: {
          Error: {
            code: 'SecretKeyNotProvided',
            message: 'You need to provide AWS Secrets Manager secert key.'
          }
        }
      });
    });
    it('should return failed when secret key does not exist', async function() {
      mockSecretsManager.mockImplementation(() => {
        return {
          promise() {
            // secretsManager:GetSecretValue
            return Promise.resolve(secret);
          }
        };
      });

      event.ResourceProperties.secretsManagerKey = 'none-existing-key';

      const result = await index.handler(event, context);
      expect(result).toEqual({
        status: 'FAILED',
        data: {
          Error: {
            code: 'SecretKeyNotFound',
            message: `AWS Secrets Manager secret requries ${event.ResourceProperties.secretsManagerKey} key.`
          }
        }
      });
    });
    it('should return failed when GetSecretValue fails', async function() {
      mockSecretsManager.mockImplementation(() => {
        return {
          promise() {
            // secretsManager:GetSecretValue
            return Promise.reject({ code: 'InternalServerError', message: 'GetSecretValue failed.' });
          }
        };
      });

      event.ResourceProperties.secretsManagerKey = 'secrets-manager-key';

      const result = await index.handler(event, context);
      expect(result).toEqual({
        status: 'FAILED',
        data: {
          Error: {
            code: 'InternalServerError',
            message: 'GetSecretValue failed.'
          }
        }
      });
    });
  });

  describe('checkFallbackImage', function() {
    // Mock event data
    const event = {
      "RequestType": "Create",
      "ResponseURL": "/cfn-response",
      "ResourceProperties": {
        "customAction": "checkFallbackImage",
        "fallbackImageS3Bucket": "fallback-image-bucket",
        "fallbackImageS3Key": "fallback-image.jpg"
      }
    };
    const head = {
      "AcceptRanges": "bytes",
      "LastModified": "2020-01-23T18:52:47.000Z",
      "ContentLength": 200237,
      "ContentType": "image/jpeg"
    };

    beforeEach(() => {
      mockS3.mockReset();
    });

    it('should return success when the default fallback image exists', async function() {
      mockS3.mockImplementation(() => {
        return {
          promise() {
            // s3:headObject
            return Promise.resolve(head);
          }
        }
      });

      const result = await index.handler(event, context);
      expect(mockS3).toHaveBeenCalledWith({ Bucket: 'fallback-image-bucket', Key: 'fallback-image.jpg' });
      expect(result).toEqual({
        status: 'SUCCESS',
        data: {
          Message: 'The default fallback image validated.',
          Data: head
        }
      });
    });
    it('should return failed when fallbackImageS3Bucket is not provided', async function() {
      event.ResourceProperties.fallbackImageS3Bucket = '';

      const result = await index.handler(event, context);
      expect(result).toEqual({
        status: 'FAILED',
        data: {
          Error: {
            code: 'S3BucketNotProvided',
            message: 'You need to provide the default fallback image bucket.'
          }
        }
      });
    });
    it('should return failed when fallbackImageS3Key is not provided', async function() {
      event.ResourceProperties.fallbackImageS3Bucket = 'fallback-image-bucket';
      event.ResourceProperties.fallbackImageS3Key = '';

      const result = await index.handler(event, context);
      expect(result).toEqual({
        status: 'FAILED',
        data: {
          Error: {
            code: 'S3KeyNotProvided',
            message: 'You need to provide the default fallback image object key.'
          }
        }
      });
    });
    it('should return failed when the default fallback image does not exist', async function() {
      event.ResourceProperties.fallbackImageS3Key = 'fallback-image.jpg';

      mockS3.mockImplementation(() => {
        return {
          promise() {
            // s3:headObject
            return Promise.reject({ code: 'NotFound' });
          }
        }
      });

      const result = await index.handler(event, context);
      expect(mockS3).toHaveBeenCalledWith({ Bucket: 'fallback-image-bucket', Key: 'fallback-image.jpg' });
      expect(result).toEqual({
        status: 'FAILED',
        data: {
          Error: {
            code: 'FallbackImageError',
            message: `Either the object does not exist or you don't have permission to access the object: fallback-image-bucket/fallback-image.jpg`
          }
        }
      });
    });
    it('should retry and return success when IAM policy is not ready so S3 API returns AccessDenied or Forbidden', async function() {
      mockS3.mockImplementationOnce(() => {
        return {
          promise() {
            // s3:headObject
            return Promise.reject({ code: 'AccessDenied' });
          }
        }
      }).mockImplementationOnce(() => {
        return {
          promise() {
            // s3:headObject
            return Promise.reject({ code: 'Forbidden' });
          }
        }
      }).mockImplementationOnce(() => {
        return {
          promise() {
            // s3:headObject
            return Promise.resolve(head);
          }
        }
      });

      const result = await index.handler(event, context);
      expect(mockS3).toHaveBeenCalledWith({ Bucket: 'fallback-image-bucket', Key: 'fallback-image.jpg' });
      expect(result).toEqual({
        status: 'SUCCESS',
        data: {
          Message: 'The default fallback image validated.',
          Data: head
        }
      });
    });
  });

  describe('Default', function() {
    // Mock event data
    const event = {
      "RequestType": "Update",
      "ResponseURL": "/cfn-response",
      "ResourceProperties": {
        "ServiceToken": "LAMBDA_ARN"
      }
    };

    it('should return success for other default custom resource', async function() {
      const result = await index.handler(event, context);
      expect(result).toEqual({
        status: 'SUCCESS',
        data: {}
      });
    });
  });

  describe('CreateCustomLoggingBucket', function() {
    const event = {
      "RequestType": "Create",
      "ResponseURL": "/cfn-response",
      "ResourceProperties": {
        "customAction": "createCFLoggingBucket",
        "stackName": "teststack",
        "bucketSuffix": `teststacktest-region01234567898`,
        "policy": {
          "Condition": {
            "Bool": {
              "aws:SecureTransport": "false"
            }
         },
          "Action": "*",
          "Resource": "",
          "Effect": "Deny",
          "Principal": "*",
          "Sid": "HttpsOnly"
        }
      }
    };
    
    beforeEach(() => {
      mockS3.mockReset();
    });

    it("Should return success and bucket name", async function() {

      mockS3.mockImplementation(() => {
        return {
          promise() {
            
            return Promise.resolve();
          }
        };
      });
      const result = await index.handler(event, context);
      expect(result).toMatchObject({
        status: 'SUCCESS',
        data: {bucketName: expect.stringMatching(/^teststack-logs-[a-z0-9]{8}/)}
      });
    });

    it("Should return failure when there is an error creating the bucket", async function() {
      mockS3.mockImplementation(() => {
        return {
          promise() {           
            return Promise.reject({message: "createBucket failed"});
          }
        };
      });
      const result = await index.handler(event, context);
      expect(result).toEqual({
        status: 'FAILED',
        data: {
          Error: {
            code: "CustomResourceError",
            message: "createBucket failed",
          }
        }
      });
    });

    it("Should return failure when there is an error enabling encryption on the created bucket", async function() {
      mockS3.mockImplementationOnce(() => {
        return {
          promise() {           
            return Promise.resolve();
          }
        };
      }).mockImplementationOnce(() => {
        return {
          promise() {           
            return Promise.reject({message: "putBucketEncryption failed"});
          }
        };
      });

      const result = await index.handler(event, context);
      expect(result).toEqual({
        status: 'FAILED',
        data: {
          Error: {
            code: "CustomResourceError",
            message: "putBucketEncryption failed",
          }
        }
      });
    });
    it("Should return failure when there is an error applying a policy to the created bucket", async function() {
      mockS3.mockImplementationOnce(() => {
        return {
          promise() {           
            return Promise.resolve();
          }
        };
      }).mockImplementationOnce(() => {
        return {
          promise() {           
            return Promise.resolve();
          }
        };
      }).mockImplementationOnce(() => {
        return {
          promise() {           
            return Promise.reject({message: "putBucketPolicy failed"});
          }
        };
      });

      const result = await index.handler(event, context);
      expect(result).toEqual({
        status: 'FAILED',
        data: {
          Error: {
            code: "CustomResourceError",
            message: "putBucketPolicy failed",
          }
        }
      });
    });
  });
});
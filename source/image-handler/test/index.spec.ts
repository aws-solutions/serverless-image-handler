// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { mockAwsS3, mockAwsParameterStore, mockJwt, mockAxios } from './mock';

import fs from 'fs';
import path from 'path';

import { handler } from '../index';
import { ImageHandlerEvent, StatusCodes } from '../lib';

describe('index', () => {
  // Arrange
  process.env.DEFAULT_AUTO_GENERATED_IMAGE_PREFIX = 'PREFIX';
  process.env.DEFAULT_PRESIGNED_URL_EXPIRES = '600';

  const mockPresignedUrlRequest = '/eyJwcmVzaWduZWRVcmwiOiJodHRwczovL3BuLnMzLmFtYXpvbmF3cy5jb20vcG4vbW9jay9pbWFnZT9YLUFtei1FeHBpcmVzPTYwMCJ9';
  const mockPresignedUrlEditsRequest = '/eyJwcmVzaWduZWRVcmwiOiJodHRwczovL3BhdGllbnRub3ctZGV2ZWxvcG1lbnQtdXMtZWFzdC0yLnMzLnVzLWVhc3QtMi5hbWF6b25hd3MuY29tL3BhdGllbnRub3dfcGF0aWVudG5vd19kb3dubG9hZF8yL1VzZXJzL1Byb2ZpbGUvMT9YLUFtei1FeHBpcmVzPTYwMCZYLUFtei1TZWN1cml0eS1Ub2tlbj1JUW9KYjNKcFoybHVYMlZqRU83JTJGJTJGJTJGJTJGJTJGJTJGJTJGJTJGJTJGJTJGd0VhQ1hWekxXVmhjM1F0TWlKSU1FWUNJUURPeEQ1UjExeVk2aXpNQzNSQW9FcDNhNXYxSFhYV3BFak9mMUVhZ2tjSnF3SWhBTzdpSE1XNXAwc1EwcCUyQndSSEVsSmsxUnZYd2hDbktoNnNhQTdFbmdrejh6S3BBRUNNZiUyRiUyRiUyRiUyRiUyRiUyRiUyRiUyRiUyRiUyRndFUUFCb01OekV3TlRZek5qZ3lNekkySWd6T1A2bTB1a0RBSVF0dDhYNHE1QU15UGIlMkI0YyUyRlhaaHdvaUkwUU5pREVxdVhLUUxrNUpaQW5Gb3Vpc0R2OXc1ZCUyQm9mVUZkWkZJWVJXU3BjNFcxNGpMSU1aaGxQM2l3dXdYeTM5WUdhRmhqMlNLc3FoZTlnU2lxbU1qQ1JNWlZ6dEVhMXZaeVhtRUZONWJMbkNadHY2Y0VGSVJWJTJCU3Ftb0NRenpFRU52bzAlMkJFa2t4bzA0a3Y5NFJ1a2ZLUmc0aDJxRXU3WmlRZnB4NjlUQVNYbkhpUU5aOEtKSTB0Nm52dEFvVWN6b2hONVI5JTJCRlFMNTJnVyUyRnNyMkFhJTJGd1NMT3dQcEd3Rk9TbGcwTzY5b0hncjBoOENDcjRTbWZNSUQ1cEZtR3dkJTJCdUlqMWVadkJGYzJQUm1UaHRIM1ZibHp1bTJMVGtlYnlYSGhrR1IxJTJCJTJGWkJ2VnczN2FnRWRtQk9UVHNLNDRFSkNRWGpKRFQ0V0ZxWVNlJTJGbGhJOHZHTDFqS0RCTWt6TzhVRFVNcWpaZzFuaGwlMkZwbm5UN3ZGVkxXVnNQbjhlWWRtVyUyRiUyRjZ4RjdHQUpYZ1FZTWxlNGdsZnB2MksyN2p3azQ4OEVqOGhla21uaDJyQ0R5aXVxbDhFZGtLUEc5alUyYkJwekhMTGNxUnJTcGQlMkJOWng0NUhPZGIxZlJEeEZ2QlV6MmZocWd3d2lOT2klMkJsdE5LYjlnWiUyQkhQaVZycXA4RjNmZXB4aHhNJTJCRTRCS25TNlJSUTIlMkZxemNERGJGQ0pEbVZsMUhZOGxGSkVmREtUMzNXdmVmZnJrbThMUFB2TkluNFNRJTJGUGFpazV4NFpYdmNhNnZ6ckFOVGhoNjBUJTJGN2xZdmVrZXZQTjBFZUd4TGZCaHVHSmNURVhWc01KdWQzSm9HT3FRQlJmandGRVF0WTFrTU52Rkg3aDFMWk02dElHRUQ5VjFrRE84ZlRSWEZmSHl2MW5YUWN3WDhYJTJGQzJhU2VScmNITlJSd3RnUnhmRjRYb1o1RlBDVGcxNGczYm9BcXlXbllpTjE1NGVrUFBLRlhHYmpuakcyMUNsdnBsZ2IlMkJhd1l1ejdKSWppemZHbXBiT01HS1dXWmI2UzlxSE9hTUVBaGZaenJPU0Z6WlZOTHhmaXFTTXd0OWFkY2x3YWw2ZiUyRmdCd3g1UnNCcXRza05ZbnRtcTdBTHdQb0cxVEdwbyUzRCZYLUFtei1BbGdvcml0aG09QVdTNC1ITUFDLVNIQTI1NiZYLUFtei1DcmVkZW50aWFsPUFTSUEySzRIRkxBTEVTTEJDTVdTLzIwMjIxMDI1L3VzLWVhc3QtMi9zMy9hd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDIyMTAyNVQwMzQ2MDRaJlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCZYLUFtei1TaWduYXR1cmU9YTU3NzE0Zjc0MjVlMWRiOWVkNmJhZjU5ZmM3MmQ1MTkyMzRmM2I5YWNmYWE0ZjQ0NzdhODU3MjI2MGQ3YmZhYSIsImVkaXRzIjp7InJlc2l6ZSI6eyJ3aWR0aCI6MjAsImhlaWdodCI6MjAsImZpdCI6Im91dHNpZGUifX19';
  const mockPresignedUrl = 'https://pn.s3.amazonaws.com/pn/mock/image?X-Amz-Expires=600';
  const imageBuffer = fs.readFileSync(
    path.resolve(__dirname, '../test/image/25x15.png'),
  )

  describe('TC: Success', () => {
    beforeEach(() => {
      // Mock
      mockAwsParameterStore.getParameter.mockImplementationOnce(() => ({
        promise() {
          return Promise.resolve({
            Parameter: { Value: 'parameter1' },
          });
        }
      }));
      mockJwt.verify.mockImplementationOnce(() => () => (
        { id: 'id1' }
      ));
      mockAxios.get.mockResolvedValue({
        data: imageBuffer
      });
      mockAwsS3.putObject.mockImplementationOnce(() => ({
        promise() {
          return Promise.resolve({});
        }
      }));
      mockAwsS3.getSignedUrl.mockResolvedValue(mockPresignedUrl);
    });

    it('001/should return the image when there is no error', async () => {
      // Arrange
      const event: ImageHandlerEvent = {
        path: mockPresignedUrlRequest,
        headers: { Authorization: 'Bearer abc123' }
      };

      // Act
      const result = await handler(event);
      const expectedResult = {
        statusCode: StatusCodes.OK,
        isBase64Encoded: true,
        headers: {
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Credentials': true,
          'Content-Type': 'image/png',
          Expires: undefined,
          'Cache-Control': 'max-age=31536000,public',
          'Last-Modified': undefined
        },
        body: imageBuffer.toString('base64')
      };

      // Assert
      expect(result).toEqual(expectedResult);
    });

    it('002/should return the presigned URL when provided', async () => {
      // Arrange
      const event: ImageHandlerEvent = {
        path: mockPresignedUrlEditsRequest,
        headers: { Authorization: 'Bearer abc123' }
      };
      const expectedBodyResult = { 'presignedUrl': mockPresignedUrl };

      // Act
      const result = await handler(event);
      const expectedResult = {
        statusCode: StatusCodes.OK,
        headers: {
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Credentials': true,
          'Content-Type': 'application/json',
          Expires: undefined,
          'Cache-Control': `max-age=${process.env.DEFAULT_PRESIGNED_URL_EXPIRES},public`,
          'Last-Modified': undefined
        },
        body: JSON.stringify(expectedBodyResult),
        isBase64Encoded: false
      };

      // Assert
      expect(result).toEqual(expectedResult);
    });
  });

  describe('TC: Error', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    it('001/should return an error when no Authorization provided', async () => {
      // Arrange
      const event: ImageHandlerEvent = {
        path: mockPresignedUrlRequest
      };

      // Act
      const result = await handler(event);
      const expectedResult = {
        statusCode: StatusCodes.UNAUTHORIZED,
        isBase64Encoded: false,
        headers: {
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Credentials': true,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: 'Unauthorized. Check the bearer token on your authorization header.',
          code: 'Unauthorized',
          status: StatusCodes.UNAUTHORIZED
        })
      };

      // Assert
      expect(result).toEqual(expectedResult);
    });

    it('002/should return an error when provided expired Authorization', async () => {
      // Arrange
      const event: ImageHandlerEvent = {
        path: mockPresignedUrlRequest,
        headers: { Authorization: 'Bearer abc123' }
      };

      // Mock
      mockAwsParameterStore.getParameter.mockImplementationOnce(() => ({
        promise() {
          return Promise.resolve({
            Parameter: { Value: 'parameter1' },
          });
        }
      }));

      // Act
      const result = await handler(event);
      const expectedResult = {
        statusCode: StatusCodes.UNAUTHORIZED,
        isBase64Encoded: false,
        headers: {
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Credentials': true,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: 'Unauthorized. Check the bearer token on your authorization header.',
          code: 'Unauthorized',
          status: StatusCodes.UNAUTHORIZED
        })
      };

      // Assert
      expect(result).toEqual(expectedResult);
    });
  });
});

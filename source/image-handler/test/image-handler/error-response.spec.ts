// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {getErrorResponse} from '../../src';
import {StatusCodes} from '../../src/lib';

describe('getErrorResponse', () => {
  it('should return an error response with the provided status code and error message', () => {
    const error = { status: 404, message: 'Not Found' };
    const result = getErrorResponse(error);

    expect(result).toEqual({
      statusCode: 404,
      headers: {
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET',
        'Cache-Control': 'max-age=3600, immutable',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(error),
    });
  });

  it('should handle "Image to composite must have same dimensions or smaller" error', () => {
    const error = { message: 'Image to composite must have same dimensions or smaller' };
    const result = getErrorResponse(error);

    expect(result).toEqual({
      statusCode: StatusCodes.BAD_REQUEST,
      headers: {
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET',
        'Cache-Control': 'max-age=3600, immutable',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'Image to overlay must have same dimensions or smaller',
        code: 'BadRequest',
        status: StatusCodes.BAD_REQUEST,
      }),
    });
  });

  it('should handle "extract_area: bad extract area" error', () => {
    const error = { message: 'extract_area: bad extract area' };
    const result = getErrorResponse(error);

    expect(result).toEqual({
      statusCode: StatusCodes.BAD_REQUEST,
      headers: {
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET',
        'Cache-Control': 'max-age=3600, immutable',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'The cropping area you provided exceeds the boundaries of the original image. Please try choosing a correct cropping value.',
        code: 'Crop::AreaOutOfBounds',
        status: StatusCodes.BAD_REQUEST,
      }),
    });
  });

  it('should handle other errors and return INTERNAL_SERVER_ERROR', () => {
    const error = { message: 'Some other error' };
    const result = getErrorResponse(error);

    expect(result).toEqual({
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      headers: {
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'Internal error. Please contact the system administrator.',
        code: 'InternalError',
        status: StatusCodes.INTERNAL_SERVER_ERROR,
      }),
    });
  });
});

// eslint-disable-next-line import/no-unresolved
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import * as HttpErrors from 'http-errors';
import * as sharp from 'sharp';
import { bufferStore, getProcessor, parseRequest } from './default';

const DefaultBufferStore = bufferStore();

export const handler = WrapError(async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  console.log('event:', JSON.stringify(event));

  if (event.rawPath === '/' || event.rawPath === '/ping') {
    return resp(200, 'ok');
  }

  const bs = getBufferStore(event);
  const { uri, actions } = parseRequest(event.rawPath, event.queryStringParameters ?? {});

  if (actions.length > 1) {
    const processor = getProcessor(actions[0]);
    const { buffer } = await bs.get(uri);
    const imagectx = { image: sharp(buffer), bufferStore: bs };
    await processor.process(imagectx, actions);
    const { data, info } = await imagectx.image.toBuffer({ resolveWithObject: true });

    return resp(200, data, info.format);
  } else {
    const { buffer, type } = await bs.get(uri, bypass);

    return resp(200, buffer, type);
  }
});

function bypass() {
  // NOTE: This is intended to tell CloudFront to directly access the s3 object without through ECS cluster.
  throw new HttpErrors[403]('Please visit s3 directly');
}

function resp(code: number, body: any, type?: string): APIGatewayProxyResultV2 {
  const isBase64Encoded = Buffer.isBuffer(body);
  let data: string = '';
  if (isBase64Encoded) {
    data = body.toString('base64');
  } else if (typeof body === 'string' && body.length > 0) {
    data = body;
    type = 'text/plain';
  } else {
    data = JSON.stringify(body);
    type = 'application/json';
  }

  return {
    isBase64Encoded,
    statusCode: code,
    headers: { 'Content-Type': type ?? 'text/plain' },
    body: data,
  };
}

interface LambdaHandlerFn {
  (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2>;
}


function WrapError(fn: LambdaHandlerFn): LambdaHandlerFn {
  return async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
    try {
      return await fn(event);
    } catch (err: any) {
      console.error(err);
      // ENOENT support
      if (err.code === 'ENOENT') {
        err.status = 404;
        err.message = 'NotFound';
      }
      const statusCode = err.statusCode ?? err.status ?? 500;
      const body = {
        status: statusCode,
        name: err.name,
        message: err.message,
      };
      return resp(statusCode, body);
    }
  };
}

function getBufferStore(event: APIGatewayProxyEventV2) {
  const bucket = event.headers['x-bucket'];
  if (bucket) {
    return bufferStore(bucket);
  }
  return DefaultBufferStore;
}
import * as sharp from 'sharp';
import * as HttpErrors from 'http-errors';
// eslint-disable-next-line import/no-unresolved
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { bufferStore, getProcessor, parseRequest } from './default';


export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  console.log('event:', JSON.stringify(event));

  if (event.rawPath === '/' || event.rawPath === '/ping') {
    return resp(200, 'ok', 'text');
  }

  const { uri, actions } = parseRequest(event.rawPath, event.queryStringParameters ?? {});

  if (actions.length > 1) {
    const processor = getProcessor(actions[0]);
    const { buffer } = await bufferStore.get(uri);
    const imagectx = { image: sharp(buffer), bufferStore };
    await processor.process(imagectx, actions);
    const { data, info } = await imagectx.image.toBuffer({ resolveWithObject: true });

    return resp(200, data, info.format);
  } else {
    const { buffer, type } = await bufferStore.get(uri, bypass);

    return resp(200, buffer, type);
  }
};

function bypass() {
  // NOTE: This is intended to tell CloudFront to directly access the s3 object without through ECS cluster.
  throw new HttpErrors[403]('Please visit s3 directly');
}

function resp(code: number, body: any, type: string) {
  const isBase64Encoded = Buffer.isBuffer(body);
  let data: string = '';
  if (isBase64Encoded) {
    data = body.toString('base64');
  } else if (typeof body === 'string' && body.length > 0) {
    data = body;
  } else {
    data = JSON.stringify(body);
  }

  return {
    isBase64Encoded,
    statusCode: code,
    headers: { 'Content-Type': type },
    body: data,
  };
}
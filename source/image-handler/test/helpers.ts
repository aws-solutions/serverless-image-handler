import { APIGatewayEventRequestContextV2, APIGatewayProxyEventV2 } from 'aws-lambda';

export const context: APIGatewayEventRequestContextV2 = {
  accountId: '',
  apiId: '',
  domainName: '',
  domainPrefix: '',
  http: { method: '', path: '', protocol: '', sourceIp: '', userAgent: '' },
  requestId: '',
  routeKey: '',
  stage: '',
  time: '',
  timeEpoch: 0,
};

export function build_event(input) {
  let event: APIGatewayProxyEventV2 = {
    isBase64Encoded: false,
    rawQueryString: '',
    requestContext: context,
    routeKey: '',
    version: '',
    rawPath: input.rawPath ?? '',
    headers: input.headers ?? {},
  };
  return event;
}

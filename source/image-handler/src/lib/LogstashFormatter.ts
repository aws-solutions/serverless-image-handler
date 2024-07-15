import { LogFormatter, LogItem } from '@aws-lambda-powertools/logger';
import { LogAttributes, UnformattedAttributes } from '@aws-lambda-powertools/logger/types';

type LogStashLog = LogAttributes & {
  '@timestamp': string;
};

const allowed_keys = ['rawPath', 'headers', 'http', 'error'];
const allowed_headers = ['accept', 'x-amz-cf-id', 'user-agent', 'host', 'origin', 'x-amzn-trace-id'];

class LogStashFormatter extends LogFormatter {
  public formatAttributes(attributes: UnformattedAttributes, additionalLogAttributes: LogAttributes): LogItem {
    const baseAttributes: LogStashLog = {
      '@timestamp': this.formatTimestamp(attributes.timestamp),
      '@version': 1,
      level: attributes.logLevel,
      message: attributes.message,
      // service: attributes.serviceName,
      environment: attributes.environment,
      awsRegion: attributes.awsRegion,
      lambdaFunction: {
        name: attributes.lambdaContext?.functionName,
        arn: attributes.lambdaContext?.invokedFunctionArn,
        memoryLimitInMB: attributes.lambdaContext?.memoryLimitInMB,
        version: attributes.lambdaContext?.functionVersion,
        coldStart: attributes.lambdaContext?.coldStart,
      },
    };
    const logItem = new LogItem({ attributes: baseAttributes });
    if (additionalLogAttributes) {
      if (additionalLogAttributes.hasOwnProperty('imageRequestInfo')) {
        let additionalLogAttribute = additionalLogAttributes['imageRequestInfo'];
        additionalLogAttribute['originalImage'] = undefined;
      }
      if (additionalLogAttributes.hasOwnProperty('headers')) {
        let headers = additionalLogAttributes['headers'];
        additionalLogAttributes['headers'] = allowed_headers.reduce((acc, key) => {
          acc[key] = headers[key];
          return acc;
        }, {});
      }

      additionalLogAttributes = allowed_keys.reduce((acc, key) => {
        acc[key] = additionalLogAttributes[key];
        return acc;
      }, {});

      logItem.addAttributes(additionalLogAttributes); // add any attributes not explicitly defined
    }

    return logItem;
  }
}

export { LogStashFormatter };

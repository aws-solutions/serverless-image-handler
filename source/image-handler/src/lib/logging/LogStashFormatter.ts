import { LogFormatter } from '@aws-lambda-powertools/logger';
import { LogAttributes, UnformattedAttributes } from '@aws-lambda-powertools/logger/lib/types';

type LogStashLog = LogAttributes;

class LogStashFormatter extends LogFormatter {
  public formatAttributes(attributes: UnformattedAttributes): LogStashLog {
    return {
      '@timestamp': this.formatTimestamp(attributes.timestamp),
      '@version': 1,
      level: attributes.logLevel,
      message: attributes.message,
      service: attributes.serviceName,
      environment: attributes.environment,
      awsRegion: attributes.awsRegion,
      correlationIds: {
        awsRequestId: attributes.lambdaContext?.awsRequestId,
        xRayTraceId: attributes.xRayTraceId,
      },
      lambdaFunction: {
        name: attributes.lambdaContext?.functionName,
        arn: attributes.lambdaContext?.invokedFunctionArn,
        memoryLimitInMB: attributes.lambdaContext?.memoryLimitInMB,
        version: attributes.lambdaContext?.functionVersion,
        coldStart: attributes.lambdaContext?.coldStart,
      },
    };
  }
}

export { LogStashFormatter };

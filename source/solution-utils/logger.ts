// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * The supported logging level.
 */
export enum LoggingLevel {
  ERROR = 1,
  WARN = 2,
  INFO = 3,
  DEBUG = 4,
  VERBOSE = 5,
}

/**
 * Logger class.
 */
export default class Logger {
  private readonly name: string;
  private readonly loggingLevel: LoggingLevel;

  /**
   * Sets up the default properties.
   * @param name The logger name which will be shown in the log.
   * @param loggingLevel The logging level to show the minimum logs.
   */
  constructor(name: string, loggingLevel: string | LoggingLevel) {
    this.name = name;

    if (typeof loggingLevel === "string" || !loggingLevel) {
      this.loggingLevel = LoggingLevel[loggingLevel] || LoggingLevel.ERROR;
    } else {
      this.loggingLevel = loggingLevel;
    }
  }

  /**
   * Logs when the logging level is lower than the default logging level.
   * @param loggingLevel The logging level of the log.
   * @param messages The log messages.
   */
  public log(loggingLevel: LoggingLevel, ...messages: unknown[]): void {
    if (loggingLevel <= this.loggingLevel) {
      this.logInternal(loggingLevel, ...messages);
    }
  }

  /**
   * Logs based on the logging level.
   * @param loggingLevel The logging level of the log.
   * @param messages The log messages.
   */
  private logInternal(loggingLevel: LoggingLevel, ...messages: unknown[]): void {
    switch (loggingLevel) {
      case LoggingLevel.VERBOSE:
      case LoggingLevel.DEBUG:
        console.debug(`[${this.name}]`, ...messages);
        break;
      case LoggingLevel.INFO:
        console.info(`[${this.name}]`, ...messages);
        break;
      case LoggingLevel.WARN:
        console.warn(`[${this.name}]`, ...messages);
        break;
      default:
        console.error(`[${this.name}]`, ...messages);
        break;
    }
  }
}

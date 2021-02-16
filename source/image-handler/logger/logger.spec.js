const Logger = require("./logger");

const LOG_LEVELS = ["log", "debug", "info", "warn", "error"];

const TEST_MESSAGE = "Hello, world!";
const TEST_DATA = { foo: "bar", countToTen: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] };
const TEST_CLOUDWATCH_EVENT = {
  path: "/path/to/image.png",
  eventID: 12345,
};

describe("Logger", () => {
  let sendMessageSpy;
  let logger;

  beforeEach(() => {
    sendMessageSpy = jest.fn();
    logger = new Logger(LOG_LEVELS, sendMessageSpy);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each(LOG_LEVELS)(
    "should log with the sendMessage callback when logged on level '%s'",
    (level) => {
      logger[level]("Hello, world!");

      expect(sendMessageSpy).toHaveBeenCalled();
    }
  );

  it("should send an empty array if no arguments were provided", () => {
    logger.log();

    expect(sendMessageSpy).toHaveBeenCalledWith({
      level: "log",
      args: [],
    });
  });

  it("should send all arguments", () => {
    logger.log(TEST_MESSAGE, TEST_DATA, TEST_DATA);

    expect(sendMessageSpy).toHaveBeenCalledWith({
      level: "log",
      args: [TEST_MESSAGE, TEST_DATA, TEST_DATA],
    });
  });

  it("should include the Cloudwatch event after its registration", () => {
    logger.registerCloudwatchEvent(TEST_CLOUDWATCH_EVENT);

    logger.log(TEST_MESSAGE);

    expect(sendMessageSpy).toHaveBeenCalledWith({
      level: "log",
      args: [TEST_MESSAGE],
      event: TEST_CLOUDWATCH_EVENT,
    });
  });
});

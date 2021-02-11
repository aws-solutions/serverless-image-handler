const sinon = require("sinon");

const { createLogger, LOG_LEVELS } = require("../logger");

const TEST_MESSAGE = "Hello, world!";
const TEST_DATA = {
  foo: "bar",
  countToTen: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
};

const CURRENT_DATE = new Date();

describe("Logger", () => {
  let clock;
  let sendSpy;
  let logger;

  beforeEach(() => {
    clock = sinon.useFakeTimers(CURRENT_DATE);
    sendSpy = jest.fn();
    logger = createLogger(LOG_LEVELS, sendSpy);
  });

  afterEach(() => {
    clock.restore();
    sendSpy.mockRestore();
  });

  it("should log a plain message correctly", () => {
    logger.log(TEST_MESSAGE);

    expect(getLastLoggedMessage()).toEqual({
      level: "log",
      msg: TEST_MESSAGE,
      ts: CURRENT_DATE.toISOString(),
    });
  });

  it("should log a plain message with additional data correctly", () => {
    logger.log(TEST_MESSAGE, TEST_DATA);

    expect(getLastLoggedMessage()).toEqual({
      level: "log",
      msg: TEST_MESSAGE,
      ts: CURRENT_DATE.toISOString(),
      data: TEST_DATA,
    });
  });

  it("should log a plain message with multiple additional data correctly", () => {
    logger.log(TEST_MESSAGE, TEST_DATA, TEST_DATA, TEST_DATA);

    expect(getLastLoggedMessage()).toEqual({
      level: "log",
      msg: TEST_MESSAGE,
      ts: CURRENT_DATE.toISOString(),
      data: [TEST_DATA, TEST_DATA, TEST_DATA],
    });
  });

  it("should log an empty message if first argument is not a string", () => {
    logger.log(TEST_DATA);

    expect(getLastLoggedMessage()).toEqual({
      level: "log",
      msg: "",
      ts: CURRENT_DATE.toISOString(),
      data: TEST_DATA,
    });
  });

  it("should log an empty message with multiple data if first argument is not a string", () => {
    logger.log(TEST_DATA, TEST_DATA, TEST_DATA);

    expect(getLastLoggedMessage()).toEqual({
      level: "log",
      msg: "",
      ts: CURRENT_DATE.toISOString(),
      data: [TEST_DATA, TEST_DATA, TEST_DATA],
    });
  });

  it.each(LOG_LEVELS)("should log to the correct log level", (level) => {
    logger[level](TEST_MESSAGE);
    const message = getLastLoggedMessage();

    expect(message.level).toBe(level);
  });

  function getLastLoggedMessage() {
    const lastCall = sendSpy.mock.calls[sendSpy.mock.calls.length - 1];
    const firstArgument = lastCall[0];
    return JSON.parse(firstArgument);
  }
});

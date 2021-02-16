const sinon = require("sinon");
const sendMessage = require("./send");

const TEST_MESSAGE = "Hello, world!";
const TEST_DATA = {
  foo: "bar",
  countToTen: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
};
const TEST_CLOUDWATCH_EVENT = {
  path: "/path/to/image.png",
  eventId: 12345,
};
const TEST_EXCEPTION = new Error("THis is an error");

const TEST_DATE = new Date();

describe("sendMessage", () => {
  let stdoutSpy;
  let clock;

  beforeEach(() => {
    stdoutSpy = jest
      .spyOn(process.stdout, "write")
      .mockImplementation(jest.fn());

    clock = sinon.useFakeTimers(TEST_DATE);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    clock.restore();
  });

  it("should log to stdout", () => {
    sendMessage({
      level: "log",
      args: [TEST_MESSAGE],
      event: TEST_CLOUDWATCH_EVENT,
    });

    expect(stdoutSpy).toHaveBeenCalled();
  });

  it("should log the correct Log4J JSON message format version", () => {
    sendMessage({
      level: "log",
      args: [TEST_MESSAGE],
    });

    expect(getLastMessage()["@version"]).toBe(1);
  });

  it("should log the correct level in uppercase", () => {
    sendMessage({
      level: "log",
      args: [TEST_MESSAGE],
    });

    expect(getLastMessage().level).toBe("LOG");
  });

  it("should send the current timestamp in ISO string format", () => {
    sendMessage({
      level: "log",
      args: [TEST_MESSAGE],
    });

    expect(getLastMessage()["@timestamp"]).toBe(TEST_DATE.toISOString());
  });

  describe("message", () => {
    it("should send the provided message", () => {
      sendMessage({
        level: "log",
        args: [TEST_MESSAGE],
      });

      expect(getLastMessage().message).toBe(TEST_MESSAGE);
    });

    it("should be empty if the first argument is not a string", () => {
      sendMessage({
        level: "log",
        args: [TEST_DATA],
      });

      expect(getLastMessage().message).toBe("");
    });

    it("should be empty if no arguments were provided", () => {
      sendMessage({
        level: "log",
        args: [],
      });

      expect(getLastMessage().message).toBe("");
    });
  });

  describe("mdc", () => {
    it("should include a warning if no Cloudwatch event was provided", () => {
      sendMessage({ level: "log", args: [] });

      expect(getLastMessage().mdc).toStrictEqual({
        _warning: "No Cloudwatch event was registered.",
      });
    });

    it("should log the Cloudwatch event path to the image to be processed", () => {
      sendMessage({ level: "log", args: [], event: TEST_CLOUDWATCH_EVENT });

      expect(getLastMessage().mdc).toStrictEqual({
        path: TEST_CLOUDWATCH_EVENT.path,
      });
    });
  });

  describe("data", () => {
    it("should not be present if no data was found in arguments", () => {
      sendMessage({ level: "log", args: [], event: TEST_CLOUDWATCH_EVENT });

      expect(getLastMessage().data).not.toBeDefined();
    });

    it("should include the data instance directly if there is only one", () => {
      sendMessage({
        level: "log",
        args: [TEST_DATA],
        event: TEST_CLOUDWATCH_EVENT,
      });

      expect(getLastMessage().data).toStrictEqual(TEST_DATA);
    });

    it("should include the all data instances in a list if there are multiple", () => {
      sendMessage({
        level: "log",
        args: [TEST_DATA, TEST_DATA],
        event: TEST_CLOUDWATCH_EVENT,
      });

      expect(getLastMessage().data).toStrictEqual([TEST_DATA, TEST_DATA]);
    });

    it("should skip the first argument if it is a string and therefore the message", () => {
      sendMessage({
        level: "log",
        args: [TEST_MESSAGE, TEST_DATA, TEST_DATA],
        event: TEST_CLOUDWATCH_EVENT,
      });

      expect(getLastMessage().data).toStrictEqual([TEST_DATA, TEST_DATA]);
    });

    it("should skip all exceptions and not include them", () => {
      sendMessage({
        level: "log",
        args: [TEST_MESSAGE, TEST_DATA, TEST_EXCEPTION, TEST_DATA],
        event: TEST_CLOUDWATCH_EVENT,
      });

      expect(getLastMessage().data).toStrictEqual([TEST_DATA, TEST_DATA]);
    });
  });

  describe("exceptions", () => {
    it("attribute should not be present if there are no exceptions", () => {
      sendMessage({
        level: "log",
        args: [TEST_MESSAGE, TEST_DATA, TEST_DATA],
        event: TEST_CLOUDWATCH_EVENT,
      });

      expect(getLastMessage().exceptions).not.toBeDefined();
    });

    it("should include the exception directly if there is only one", () => {
      sendMessage({
        level: "log",
        args: [TEST_EXCEPTION],
        event: TEST_CLOUDWATCH_EVENT,
      });

      const { message, stack } = TEST_EXCEPTION;

      expect(getLastMessage().exceptions).toStrictEqual({ message, stack });
    });

    it("should include all exceptions in a list if there are multiple", () => {
      sendMessage({
        level: "log",
        args: [TEST_EXCEPTION, TEST_EXCEPTION],
        event: TEST_CLOUDWATCH_EVENT,
      });

      const { message, stack } = TEST_EXCEPTION;

      expect(getLastMessage().exceptions).toStrictEqual([
        { message, stack },
        { message, stack },
      ]);
    });
  });

  function getLastMessage() {
    const message = stdoutSpy.mock.calls[stdoutSpy.mock.calls.length - 1][0];
    return JSON.parse(message);
  }
});

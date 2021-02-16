const Logger = require("./logger");
const sendMessage = require("./send");

const logger = new Logger(
  ["log", "debug", "info", "warn", "error"],
  process.env.NODE_ENV === "test" ? () => {} : sendMessage
);

module.exports = logger;

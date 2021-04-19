const Logger = require("./logger");
const sendMessage = require("./send");

const isDevelopment = process.env.NODE_ENV === 'development'
const isTest = process.env.NODE_ENV === "test";

let pipe = sendMessage;
if (isTest) {
  pipe = () => {
  };
} else if (isDevelopment) {
  pipe = console.log;
}

const logger = new Logger(
  ["trace", "debug", "info", "warn", "error"],
  pipe
);

module.exports = logger;

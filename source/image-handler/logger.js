const LOG_LEVELS = ["log", "debug", "warn", "error"];

const logger = createLogger(LOG_LEVELS, sendToStdOut);

function createLogger(levels, send) {
  return levels.reduce(
    (acc, level) => ({
      ...acc,
      [level]: (message, ...data) => send(composeMessage(level, message, data)),
    }),
    {}
  );
}

function sendToStdOut(message) {
  console.log(message);
}

function composeMessage(level, message, data) {
  if (typeof message !== "string") {
    data = [message, ...data];
    message = "";
  }

  if (data.length == 0) {
    data = undefined;
  } else if (data.length == 1) {
    data = data[0];
  }

  return JSON.stringify({
    level,
    msg: message,
    ts: new Date().toISOString(),
    ...(data ? { data } : {}),
  });
}

module.exports = logger;
module.exports.createLogger = createLogger;
module.exports.LOG_LEVELS = LOG_LEVELS;

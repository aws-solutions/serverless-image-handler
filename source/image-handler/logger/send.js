const sendMessage = (payload) => {
  const message = JSON.stringify(createMessage(payload));
  process.stdout.write(message + "\n");
};

function createMessage(payload) {
  return {
    "@version": 1,
    "@timestamp": new Date().toISOString(),
    level: payload.level.toUpperCase(),
    message: getMessage(payload),
    mdc: getMdc(payload),
    ...addIfExists("data", getData(payload)),
    ...addIfExists("exceptions", getExeceptions(payload)),
  };
}

function getMessage({ args }) {
  if (args.length > 0 && isString(args[0])) {
    return args[0];
  }

  return "";
}

function getMdc({ event }) {
  if (!event) {
    return { _warning: "No Cloudwatch event was registered." };
  }

  return {
    path: event.path,
  };
}

function addIfExists(attribute, list) {
  if (!list || list.length === 0) {
    return {};
  } else if (list.length === 1) {
    return { [attribute]: list[0] };
  } else {
    return { [attribute]: list };
  }
}

function getExeceptions({ args }) {
  return args
    .filter((arg) => isException(arg))
    .map(({ message, stack }) => ({
      message,
      stack,
    }));
}

function getData({ args }) {
  return (args.length > 0 && isString(args[0]) ? args.slice(1) : args).filter(
    (entity) => !isException(entity)
  );
}

function isException(e) {
  return e instanceof Error || (e && e.stack && e.message);
}

function isString(s) {
  return typeof s === "string";
}

module.exports = sendMessage;

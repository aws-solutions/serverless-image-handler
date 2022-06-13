const ignored_keys = new Set(['requestContext', 'originalImage', 'multiValueHeaders']);
function replacer(key, value) {
  // Filtering out binary image data
  if (ignored_keys.has(key)) {
    return undefined;
  }
  return value;
}

const sendMessage = (payload) => {
  const message = JSON.stringify(createMessage(payload), replacer);
  process.stdout.write(message + "\n");
};

function createMessage(payload) {
  return {
    "@version": 1,
    "@timestamp": new Date().toISOString(),
    level: payload.level.toUpperCase(),
    message: getMessage(payload),
    path: payload.event && payload.event.path,
    mdc: getMdc(payload),
    ...addIfExists("data", getData(payload)),
    ...addIfExists("exception", getExceptions(payload)),
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
    accept: event.headers && (event.headers.accept || event.headers.Accept),
    user_agent: event.headers && (event.headers["User-Agent"] || event.headers["user-agent"])
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

function getExceptions({ args }) {
  return args
    .filter((arg) => isException(arg))
    .map(({ message, stack }) => ({
      "exception_message": message,
      "stacktrace": stack,
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

class Logger {
  constructor(levels, sendMessage) {
    this._sendMessage = sendMessage;

    levels.forEach((level) => {
      this[level] = (...args) =>
        this._sendMessage({
          level,
          args,
          ...(this._event ? { event: this._event } : {}),
        });
    });
  }

  registerCloudwatchEvent(event) {
    this._event = event;
  }
}

module.exports = Logger;

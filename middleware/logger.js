const moment = require('moment-timezone');
const morgan = require('morgan');

const loggerOptions = (tokens, req, res) => {
  return [
    tokens.method(req, res),
    tokens.url(req, res),
    tokens.status(req, res),
  ].join(' ');
};

exports.customLogger = morgan(loggerOptions);

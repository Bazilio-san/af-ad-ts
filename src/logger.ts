import cache from 'memory-cache';
import { IAbstractLogger } from './@type/i-abstract-logger';

const noop = () => null;

const abstractLogger: IAbstractLogger = {
  fatal: noop,
  error: noop,
  warn: noop,
  info: noop,
  silly: noop,
  debug: noop,
  trace: noop,
};

export const getLogger = (logger?: IAbstractLogger) => {
  const cachedLogger = cache.get('logger');
  if (logger) {
    if (!cachedLogger) {
      cache.put('logger', logger);
    }
    return logger;
  }
  return cachedLogger || abstractLogger;
};

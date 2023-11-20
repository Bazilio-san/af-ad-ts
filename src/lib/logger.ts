import { lBlue, magenta } from 'af-color';
import { IAbstractLogger } from '../@type/i-abstract-logger';

let globalLogger: {
  trace: Function;
};

export const setLogger = (logger: IAbstractLogger) => {
  if (logger?.trace) {
    globalLogger = logger;
  } else if (logger?.silly) {
    globalLogger = { trace: logger.silly.bind(logger) };
  }
};

let colorIndex = 0;
const colors = [lBlue, magenta];
const nextColor = (): string => {
  colorIndex = colorIndex ? 0 : 1;
  return colors[colorIndex];
};

export const trace = (message: string, color?: string) => {
  if (globalLogger) {
    globalLogger.trace(`${color || nextColor()}${message}\n`);
  }
};

export const toJson = (o: any): string => {
  const type = typeof o;
  if (type === 'number' || type === 'boolean' || o == null) {
    return String(o);
  }
  if (type === 'string') {
    return o;
  }
  try {
    return JSON.stringify(o, undefined, 2);
  } catch (err: Error | any) {
    return String(err.message || err);
  }
};

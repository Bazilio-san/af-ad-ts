import { lBlue, magenta } from 'af-color';

let globalLogger: {
  trace: Function;
};

export const setLogger = (logger?: any) => {
  if (logger?.trace) {
    globalLogger = logger;
  } else if (logger?.silly) {
    globalLogger = { trace: logger.silly.bind(logger) };
  } else if (logger) {
    globalLogger = { trace: logger };
  } else {
    // eslint-disable-next-line no-console
    globalLogger = { trace: console.log.bind(console) };
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

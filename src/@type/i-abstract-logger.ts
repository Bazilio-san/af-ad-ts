export interface IAbstractLogger {
  fatal: Function,
  error: Function,
  warn: Function,
  info: Function,
  debug: Function,
  trace: Function,
  silly: Function,
}

import { inspect } from "node:util";
import { serializeError } from "serialize-error";

export enum LogLevel {
  Silent = 1,
  Fatal = 2,
  Error = 3,
  Warn = 4,
  Success = 5,
  Info = 6,
  Debug = 7,
}

const ENV_LEVELS: Record<string, LogLevel> = {
  silent: LogLevel.Silent,
  fatal: LogLevel.Fatal,
  error: LogLevel.Error,
  warn: LogLevel.Warn,
  warning: LogLevel.Warn,
  success: LogLevel.Success,
  info: LogLevel.Info,
  debug: LogLevel.Debug,
};
const logLevel =
  // @ts-expect-error: Works when LOG_LEVEL is undefined
  Number(ENV_LEVELS[globalThis.process?.env?.LOG_LEVEL]) || LogLevel.Info;

export enum LogFormat {
  Pretty,
  Json,
}
const logFormat = globalThis.process?.env?.LOG_FORMAT
  ? globalThis.process.env.LOG_FORMAT === "json"
    ? LogFormat.Json
    : LogFormat.Pretty
  : globalThis.process?.env?.NODE_ENV === "production"
    ? LogFormat.Json
    : LogFormat.Pretty;

export type Formatter = (
  log: (...args: any[]) => void,
  level: LogLevel,
  namespace: string,
  message: string,
  meta: Record<string, unknown> | undefined,
) => void;

const RESET = "\x1b[0m";
const DIM = "\x1b[2m";
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const BLUE = "\x1b[34m";
const MAGENTA = "\x1b[35m";
const CYAN = "\x1b[36m";
const GREY = "\x1b[37m";
const BG_RED = "\x1b[41m";

function createPrettyFormatter(): Formatter {
  const colors: Record<LogLevel, string> = {
    [LogLevel.Debug]: GREY,
    [LogLevel.Info]: BLUE,
    [LogLevel.Success]: GREEN,
    [LogLevel.Warn]: YELLOW,
    [LogLevel.Error]: RED,
    [LogLevel.Fatal]: BG_RED,
    [LogLevel.Silent]: RESET,
  };
  const symbols: Record<LogLevel, string> = {
    [LogLevel.Debug]: "→",
    [LogLevel.Info]: "i",
    [LogLevel.Success]: "✓",
    [LogLevel.Warn]: "‼",
    [LogLevel.Error]: "×",
    [LogLevel.Fatal]: "×",
    [LogLevel.Silent]: " ",
  };

  const namespaceColors: string[] = [
    GREY,
    RED,
    YELLOW,
    BLUE,
    GREEN,
    CYAN,
    MAGENTA,
  ];

  return (log, level, namespace, message, meta) => {
    const args: unknown[] = [
      `${colors[level]}${symbols[level]}${RESET}`,
      `${DIM}${
        namespaceColors[
          namespace.slice(0, namespace.indexOf(":")).length %
            namespaceColors.length
        ]
      }${namespace}${RESET}`,
      message,
    ];
    if (meta) args.push(DIM + inspect(meta, { colors: true }) + RESET);

    log(...args);
  };
}

function createJsonFormatter(): Formatter {
  const levelNames: Record<LogLevel, string> = {
    [LogLevel.Debug]: "debug",
    [LogLevel.Info]: "info",
    [LogLevel.Success]: "success",
    [LogLevel.Warn]: "warn",
    [LogLevel.Error]: "error",
    [LogLevel.Fatal]: "fatal",
    [LogLevel.Silent]: "silent",
  };

  return (log, level, namespace, message, meta) =>
    log(
      JSON.stringify(
        serializeError({
          level: levelNames[level],
          namespace,
          message,
          time: new Date().toISOString(),
          ...meta,
        }),
      ),
    );
}

const formatter =
  logFormat === LogFormat.Json
    ? createJsonFormatter()
    : createPrettyFormatter();

export interface Logger {
  fatal(message: string, meta?: Record<string, unknown>): never;
  error(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  success(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  debug(message: string, meta?: Record<string, unknown>): void;
  blank(): void;
  extend(namespace: string): Logger;
}

export function createLogger(namespace: string): Logger {
  return {
    debug(message, meta) {
      if (logLevel >= LogLevel.Debug)
        formatter(console.log, LogLevel.Debug, namespace, message, meta);
    },
    info(message, meta) {
      if (logLevel >= LogLevel.Info)
        formatter(console.log, LogLevel.Info, namespace, message, meta);
    },
    success(message, meta) {
      if (logLevel >= LogLevel.Success)
        formatter(console.log, LogLevel.Success, namespace, message, meta);
    },
    warn(message, meta) {
      if (logLevel >= LogLevel.Warn)
        formatter(console.log, LogLevel.Warn, namespace, message, meta);
    },
    error(message, meta) {
      if (logLevel >= LogLevel.Error)
        formatter(console.log, LogLevel.Error, namespace, message, meta);
    },
    fatal(message, meta) {
      if (logLevel >= LogLevel.Fatal)
        formatter(console.log, LogLevel.Fatal, namespace, message, meta);
      process.exit(1);
    },
    blank() {
      if (logFormat === LogFormat.Pretty) console.log();
    },
    extend(childNamespace) {
      return createLogger(`${namespace}:${childNamespace}`);
    },
  };
}

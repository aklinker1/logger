import { inspect } from "node:util";

const isProduction = globalThis.process?.env?.NODE_ENV === "production";

/**
 * Numeric log levels used to control verbosity. Higher values are more verbose.
 * The active level is determined by the `LOG_LEVEL` environment variable (defaults to {@link LogLevel.Info}).
 * Messages are only output when their level is less than or equal to the active level.
 */
export enum LogLevel {
  /** Suppresses all log output. */
  Silent = 1,
  /** Unrecoverable errors that cause the process to exit. */
  Fatal = 2,
  /** Errors that do not necessarily require the process to exit. */
  Error = 3,
  /** Potentially harmful situations worth investigating. */
  Warn = 4,
  /** Confirmation that an operation completed successfully. */
  Success = 5,
  /** General informational messages. This is the default level. */
  Info = 6,
  /** Verbose diagnostic information useful during development. */
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

/**
 * Output format for log messages.
 *
 * Determined by the `LOG_FORMAT` environment variable (`"json"` or `"pretty"`).
 * When not set, defaults to {@link LogFormat.Json} in production (`NODE_ENV === "production"`)
 * and {@link LogFormat.Pretty} otherwise.
 */
export enum LogFormat {
  /** Human-readable, colorized output for terminal use. */
  Pretty,
  /** Structured JSON output suitable for log aggregation systems. */
  Json,
}
const logFormat = globalThis.process?.env?.LOG_FORMAT
  ? globalThis.process.env.LOG_FORMAT === "json"
    ? LogFormat.Json
    : LogFormat.Pretty
  : globalThis.process?.env?.NODE_ENV === "production"
    ? LogFormat.Json
    : LogFormat.Pretty;

/**
 * A function responsible for writing a single log entry.
 *
 * @param log - The underlying logging function (e.g. `console.log`).
 * @param level - The severity level of the message.
 * @param namespace - The colon-delimited namespace of the logger.
 * @param message - The log message text.
 * @param meta - Optional key/value metadata to include with the message.
 */
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

  const namespaceColors: string[] = [GREY, RED, YELLOW, BLUE, GREEN, CYAN, MAGENTA];

  return (log, level, namespace, message, meta) => {
    const args: unknown[] = [
      `${colors[level]}${symbols[level]}${RESET}`,
      `${DIM}${
        namespaceColors[namespace.slice(0, namespace.indexOf(":")).length % namespaceColors.length]
      }${namespace}${RESET}`,
      message,
    ];
    if (meta)
      args.push(DIM + inspect(meta, {
        colors: true,
        breakLength: process.stdout.getWindowSize()[0] 
      }) + RESET);

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
        toJson({
          level: levelNames[level],
          namespace,
          message,
          time: new Date(),
          ...meta,
        }),
      ),
    );
}

const formatter = logFormat === LogFormat.Json ? createJsonFormatter() : createPrettyFormatter();

/** A structured logger that supports multiple severity levels, namespacing, and metadata. */
export interface Logger {
  /**
   * Log a fatal message and terminate the process with exit code 1.
   * @param message - The log message.
   * @param meta - Optional metadata to attach to the log entry.
   */
  fatal(message: string, meta?: Record<string, unknown>): never;
  /**
   * Log an error message.
   * @param message - The log message.
   * @param meta - Optional metadata to attach to the log entry.
   */
  error(message: string, meta?: Record<string, unknown>): void;
  /**
   * Log a warning message.
   * @param message - The log message.
   * @param meta - Optional metadata to attach to the log entry.
   */
  warn(message: string, meta?: Record<string, unknown>): void;
  /**
   * Log a success message.
   * @param message - The log message.
   * @param meta - Optional metadata to attach to the log entry.
   */
  success(message: string, meta?: Record<string, unknown>): void;
  /**
   * Log an informational message.
   * @param message - The log message.
   * @param meta - Optional metadata to attach to the log entry.
   */
  info(message: string, meta?: Record<string, unknown>): void;
  /**
   * Log a debug message.
   * @param message - The log message.
   * @param meta - Optional metadata to attach to the log entry.
   */
  debug(message: string, meta?: Record<string, unknown>): void;
  /** Print a blank line. Only produces output when the log format is {@link LogFormat.Pretty}. */
  blank(): void;
  /**
   * Create a child logger with an extended namespace.
   * The child's namespace is formed by appending `:<namespace>` to the parent's namespace.
   * @param namespace - The namespace segment to append.
   * @returns A new {@link Logger} with the extended namespace.
   */
  extend(namespace: string): Logger;
}

/**
 * Create a new {@link Logger} instance with the given namespace.
 *
 * @example
 * ```ts
 * const logger = createLogger("app");
 * logger.info("Server started", { port: 3000 });
 *
 * const dbLogger = logger.extend("db");
 * dbLogger.debug("Query executed");
 * ```
 *
 * @param namespace - A label that identifies the source of log messages (e.g. `"app"`, `"http"`).
 * @returns A {@link Logger} bound to the given namespace.
 */
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

function toJson(obj: unknown): any {
  if (obj == null) return obj;

  if (obj instanceof Date) return obj.toISOString();
  if (obj instanceof Map)
    return Object.fromEntries(obj.entries().map((entry) => [entry[0], toJson(entry[1])]));
  if (obj instanceof Set) return Array.from(obj).map(toJson);

  if (obj instanceof Error)
    return {
      // Not included when spreading object...

      // @ts-expect-error: Not always overridden by the spread
      name: obj.name,
      // @ts-expect-error: Not always overridden by the spread
      message: obj.message,
      ...(obj.cause && toJson(obj.cause)),
      ...(isProduction && { stack: obj.stack }),

      // Any custom properties set on the class will be included here
      ...obj,
    };

  switch (typeof obj) {
    case "number":
    case "boolean":
    case "string":
      return obj;
    case "object":
      return Array.isArray(obj)
        ? obj.map(toJson)
        : Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, toJson(v)]));
  }

  return obj.toString();
}

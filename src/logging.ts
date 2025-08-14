import pino from "pino";
import { createPrettyLogStream } from "./logging-dev";

// Define our log levels and types
type LogContext = Record<string, unknown>;

// Define our log levels
export const LOG_LEVELS = {
  trace: 10,
  debug: 20,
  details: 25,
  log: 30,
  info: 35,
  warn: 40,
  error: 50,
  critical: 60,
} as const;

const levelToShort = {
  10: "TRC",
  20: "DBG",
  25: "DTL",
  30: "LOG",
  35: "INF",
  40: "WRN",
  50: "ERR",
  60: "CRT",
} as const;

// Define our custom log levels
type LogLevel = keyof typeof LOG_LEVELS;

// Type for the pino logger with our custom levels
type PinoLogger = pino.Logger<LogLevel> & { [key in LogLevel]: pino.LogFn } & {
  child(bindings: pino.Bindings, options?: pino.ChildLoggerOptions): PinoLogger;
};

// Custom formatters (shared, but level formatter is only for prod)
const formatters = {
  bindings: (bindings: Record<string, unknown>) => ({
    name: bindings.name,
    pid: bindings.pid,
    hostname: bindings.hostname,
  }),
  level: (label: string) => ({
    level: Object.keys(LOG_LEVELS).includes(label)
      ? levelToShort[LOG_LEVELS[label as LogLevel]]
      : "UNK",
  }),
};

// Base logger configuration (timestamp shared)
const baseConfig: pino.LoggerOptions<LogLevel, true> = {
  customLevels: LOG_LEVELS,
  useOnlyCustomLevels: true,
  formatters,
  timestamp: () => `,"time":"${new Date().toISOString()}"`,
} as const;

// Development configuration (no level formatter so pino-pretty gets numeric levels)
const devConfig: pino.LoggerOptions<LogLevel, true> = {
  ...baseConfig,
  formatters: {
    bindings: formatters.bindings, // Keep bindings, but omit level formatter
  },
  level:
    process.env.LOG_LEVEL && process.env.LOG_LEVEL in LOG_LEVELS
      ? (process.env.LOG_LEVEL as LogLevel)
      : "details",
} as const;

// Production configuration (JSON with string levels)
const prodConfig: pino.LoggerOptions<LogLevel, true> = {
  ...baseConfig,
  level:
    process.env.LOG_LEVEL && process.env.LOG_LEVEL in LOG_LEVELS
      ? (process.env.LOG_LEVEL as LogLevel)
      : "info",
} as const;

const envConfig =
  process.env.NODE_ENV === "production" ? prodConfig : devConfig;

// Browser-specific configuration - minimal, no pretty
const browserConfig: pino.LoggerOptions<LogLevel, true> = {
  // ...envConfig,
  customLevels: LOG_LEVELS,
  useOnlyCustomLevels: true,
  browser: {
    asObject: false,
  },
} as const;

// Create the base logger instance with custom levels
const createLogger = (name: string, level?: LogLevel): PinoLogger => {
  // Get the appropriate config based on environment
  let config: pino.LoggerOptions<LogLevel, true>;

  const isRealBrowser =
    typeof window !== "undefined" &&
    typeof document !== "undefined" &&
    typeof navigator !== "undefined" &&
    !navigator.userAgent.includes("Node.js") &&
    typeof process === "undefined";

  const isNextJS =
    (typeof window !== "undefined" && typeof process !== "undefined") ||
    (typeof process !== "undefined" && process.env?.NEXT_RUNTIME) ||
    (typeof process !== "undefined" &&
      Object.keys(process.env || {}).some((key) =>
        key.startsWith("NEXT_PUBLIC_")
      ));

  if (isRealBrowser) {
    config = browserConfig;
  } else if (process.env.NODE_ENV === "production") {
    config = prodConfig;
  } else {
    config = devConfig;
  }

  let logger: PinoLogger;

  if (config === devConfig && typeof window === "undefined") {
    logger = pino<LogLevel>(
      {
        ...config,
        level: level || config.level,
      },
      createPrettyLogStream()
    );
  } else {
    logger = pino<LogLevel>({
      ...config,
      level: level || config.level,
    });
  }

  return logger.child({ name });
};

/**
 * A logger class that wraps pino to provide a familiar interface
 * with additional features like Slack notifications for critical errors.
 */
export class Logger {
  private readonly logger: PinoLogger;
  private readonly name: string;
  private static readonly slackWebhookUrl: string | null =
    process.env.SLACK_WEBHOOK_URL || null;
  private readonly isBrowser: boolean;

  constructor(name: string) {
    this.name = name;
    this.isBrowser = typeof window !== "undefined";
    this.logger = createLogger(name);
  }

  /**
   * Create a new logger instance with an extended name
   * @param subname The subname to append to the current logger name
   * @returns A new Logger instance with the extended name
   */
  public extend(subname: string): Logger {
    return new Logger(`${this.name}.${subname}`);
  }

  /** Critical errors that require immediate attention and may affect system stability
   * Examples: Database connection failure, system crash, unrecoverable errors
   */
  critical(message: string, ...args: unknown[]): void {
    this.logger.critical(message, ...args);

    // Send to Slack if webhook URL is configured
    if (Logger.slackWebhookUrl) {
      const slackMessage = {
        text: `[${this.name}] CRITICAL: ${message}`,
        attachments: [
          {
            text:
              Object.keys(args).length > 0
                ? "```" + JSON.stringify(args, null, 2) + "```"
                : "No additional context",
            color: "danger",
          },
        ],
      };
    }
  }

  /** Errors that indicate something went wrong but system can continue operating
   * Examples: Failed API requests, caught exceptions, validation errors
   */
  error(message: string, ...args: unknown[]): void {
    this.logger.error(message, ...args);
  }

  /** Warnings about potentially harmful situations or deprecated features
   * Examples: Using fallback values, approaching resource limits, deprecated API usage
   */
  warn(message: string, ...args: unknown[]): void {
    this.logger.warn(message, ...args);
  }

  /** Important operational events and milestones in the application
   * Examples: Service start/stop, scheduled job execution, queue statistics
   */
  log(message: string, ...args: unknown[]): void {
    this.logger.log(message, ...args);
  }

  /** High-level user or business events that track normal operation
   * Examples: User actions, successful transactions, feature usage
   */
  info(message: string, ...args: unknown[]): void {
    this.logger.info(message, ...args);
  }

  /** Additional context or nested information related to previous log entries
   * Examples: Detailed error responses, sub-steps of a process, nested data
   */
  details(message: string, ...args: unknown[]): void {
    this.logger.details(message, ...args);
  }

  /** Detailed information for debugging purposes
   * Examples: Variable values, function parameters, state changes
   */
  debug(message: string, ...args: unknown[]): void {
    this.logger.debug(message, ...args);
  }

  /** Prints a stack trace for debugging execution flow and call hierarchies
   * Examples: Debugging complex call chains, identifying code paths, tracking function call origins
   * Note: Use sparingly as stack traces are expensive to generate and print
   */
  trace(message: string, ...args: unknown[]): void {
    this.logger.trace(message, ...args);
  }
}

/**
 * A logger with colored output for development
 * This is just a thin wrapper around the base Logger since pino-pretty handles colors
 */
export class ColorLogger extends Logger {
  // In development, pino-pretty already handles colors
  // This class is maintained for backward compatibility
}

// Export a default instance for convenience
export const logger = new Logger("app");

logger.critical("This is a critical log message");
logger.error("This is an error log message");
logger.warn("This is a warning log message");
logger.log("This is a log message");
logger.info("This is an info log message");
logger.details("This is a details log message");
logger.debug("This is a debug log message");
logger.trace("This is a trace log message");
logger.extend("submodule").info("This is an info message from a submodule");

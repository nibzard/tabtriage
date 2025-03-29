// Simple logging utility for debugging

// Log levels
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

// Current log level (can be changed at runtime)
let currentLogLevel = LogLevel.INFO;

// Enable/disable logging to console
let loggingEnabled = true;

// Log history for debugging
const logHistory: Array<{level: LogLevel, message: string, data?: any, timestamp: Date}> = [];
const MAX_LOG_HISTORY = 1000; // Maximum number of log entries to keep

// Set the current log level
export function setLogLevel(level: LogLevel) {
  currentLogLevel = level;
}

// Enable or disable logging
export function enableLogging(enabled: boolean) {
  loggingEnabled = enabled;
}

// Get the log history
export function getLogHistory() {
  return [...logHistory];
}

// Clear the log history
export function clearLogHistory() {
  logHistory.length = 0;
}

// Log a message if the current log level allows it
function log(level: LogLevel, message: string, data?: any) {
  // Always add to history
  logHistory.push({
    level,
    message,
    data,
    timestamp: new Date()
  });

  // Trim history if needed
  if (logHistory.length > MAX_LOG_HISTORY) {
    logHistory.shift();
  }

  // Only log to console if enabled and level is high enough
  if (loggingEnabled && level >= currentLogLevel) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${LogLevel[level]}]`;

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(prefix, message, data !== undefined ? data : '');
        break;
      case LogLevel.INFO:
        console.info(prefix, message, data !== undefined ? data : '');
        break;
      case LogLevel.WARN:
        console.warn(prefix, message, data !== undefined ? data : '');
        break;
      case LogLevel.ERROR:
        console.error(prefix, message, data !== undefined ? data : '');
        break;
    }
  }
}

// Convenience methods for different log levels
export const logger = {
  debug: (message: string, data?: any) => log(LogLevel.DEBUG, message, data),
  info: (message: string, data?: any) => log(LogLevel.INFO, message, data),
  warn: (message: string, data?: any) => log(LogLevel.WARN, message, data),
  error: (message: string, data?: any) => log(LogLevel.ERROR, message, data)
};

// In development, set to debug level by default
if (process.env.NODE_ENV === 'development') {
  setLogLevel(LogLevel.DEBUG);
}
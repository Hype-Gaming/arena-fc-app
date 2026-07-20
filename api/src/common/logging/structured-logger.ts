// api/src/common/logging/structured-logger.ts

export type LogLevel = 'info' | 'warn' | 'error';

export interface LogFields {
  [key: string]: unknown;
}

/**
 * Emit one structured JSON log line, so request/error events are greppable and
 * ready for any aggregator later without touching app code. info → stdout;
 * warn/error → stderr (so a log collector can split them). `undefined` fields
 * are dropped by JSON.stringify, keeping lines compact.
 */
export function logJson(
  level: LogLevel,
  msg: string,
  fields: LogFields = {},
): void {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    msg,
    ...fields,
  });
  if (level === 'info') process.stdout.write(line + '\n');
  else process.stderr.write(line + '\n');
}

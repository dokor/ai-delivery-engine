function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

export function logLines(lines: string[]): void {
  for (const line of lines) {
    console.log(line);
  }
}

export function logFailure(prefix: string, error: unknown): void {
  console.error(`${prefix}: ${getErrorMessage(error)}`);
  process.exitCode = 1;
}

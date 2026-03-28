export function createLogger({ verbose = false, debug = false } = {}) {
  const out = {
    info: (message) => process.stdout.write(`${message}\n`),
    warn: (message) => process.stderr.write(`[warn] ${message}\n`),
    error: (message) => process.stderr.write(`[error] ${message}\n`),
    verbose: (message) => {
      if (verbose || debug) process.stderr.write(`[verbose] ${message}\n`);
    },
    debug: (message) => {
      if (debug) process.stderr.write(`[debug] ${message}\n`);
    }
  };
  return out;
}

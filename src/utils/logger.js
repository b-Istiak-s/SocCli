export function createLogger({ verbose = false, debug = false } = {}) {
  return {
    info: (...args) => console.log(...args),
    warn: (...args) => console.warn(...args),
    error: (...args) => console.error(...args),
    verbose: (...args) => {
      if (verbose || debug) console.error('[verbose]', ...args);
    },
    debug: (...args) => {
      if (debug) console.error('[debug]', ...args);
    }
  };
}

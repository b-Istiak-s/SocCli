#!/usr/bin/env node
import { run } from '../src/cli/program.js';

run(process.argv).catch((error) => {
  const msg = error?.stack || error?.message || String(error);
  process.stderr.write(`${msg}\n`);
  process.exitCode = 1;
});

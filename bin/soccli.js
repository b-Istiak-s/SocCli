#!/usr/bin/env node

import { run } from '../src/cli/program.js';

run(process.argv).catch((error) => {
  console.error(error?.message ?? String(error));
  process.exit(1);
});

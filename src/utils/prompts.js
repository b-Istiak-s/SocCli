import readline from 'node:readline';
import { printSystem } from './output.js';

export async function startInteractiveSession({
  onLine,
  onClose,
  prompt = '> ',
  intro = 'Interactive mode started. Type /exit to quit.'
}) {
  printSystem(intro);
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  rl.setPrompt(prompt);
  rl.prompt();

  rl.on('line', async (line) => {
    const trimmed = line.trim();
    if (trimmed === '/exit' || trimmed === '/quit') {
      rl.close();
      return;
    }
    await onLine(line);
    rl.prompt();
  });

  return new Promise((resolve) => {
    rl.on('close', async () => {
      await onClose?.();
      resolve();
    });
  });
}

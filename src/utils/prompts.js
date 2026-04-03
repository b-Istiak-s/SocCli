import readline from 'node:readline';

export function startInteractivePrompt({ onLine, onClose, promptText = '> ' }) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true
  });

  rl.setPrompt(promptText);
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

  rl.on('close', () => {
    onClose?.();
  });

  return rl;
}

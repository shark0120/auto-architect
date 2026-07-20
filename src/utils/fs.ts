import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

export function createFile(filePath: string, content: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, content.trim() + '\n', 'utf-8');
  console.log(`${chalk.green('CREATE')} ${filePath}`);
}

#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { parsePromptToSchema } from './parser.js';
import { scaffoldProject } from './generators/engine.js';

const program = new Command();

program
  .name('auto-architect')
  .description('AI-powered CLI to scaffold complete full-stack architectures')
  .version('1.0.0');

program
  .command('generate')
  .alias('g')
  .description('Generate a new project from a natural language prompt')
  .argument('<prompt>', 'Describe the architecture you want')
  .option('-d, --dir <directory>', 'Target directory', './my-auto-app')
  .action(async (prompt, options) => {
    console.log(chalk.blue(`\n🚀 Generating architecture for:`));
    console.log(chalk.italic(`"${prompt}"\n`));
    
    try {
      const schema = await parsePromptToSchema(prompt);
      await scaffoldProject(schema, options.dir);
    } catch (err) {
      console.error(chalk.red('Failed to generate architecture.'), err);
    }
  });

program.parse();

#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { parsePromptToSchema } from './parser.js';
import { scaffoldProject } from './generators/engine.js';

const program = new Command();

program
  .name('auto-architect')
  .description('Scaffold a runnable project skeleton from a plain-English stack description')
  .version('1.0.0');

program
  .command('generate')
  .alias('g')
  .description('Generate a new project from a stack description')
  .argument('<prompt>', 'Describe the stack you want, e.g. "Next.js with Supabase and Tailwind"')
  .option('-d, --dir <directory>', 'Target directory', './my-auto-app')
  .option('--dry-run', 'Print the files that would be created without writing them', false)
  .action((prompt: string, options: { dir: string; dryRun: boolean }) => {
    const schema = parsePromptToSchema(prompt);

    console.log(chalk.bold('\nResolved stack'));
    console.log(`  Framework : ${schema.framework}`);
    console.log(`  Styling   : ${schema.styling}`);
    console.log(`  Database  : ${schema.database ?? 'None'}`);
    console.log(`  Auth      : ${schema.auth ?? 'None'}`);
    console.log(`  CI/CD     : ${schema.ci ?? 'None'}`);
    console.log(`  Features  : ${schema.features.length > 0 ? schema.features.join(', ') : 'None'}`);

    if (schema.unrecognized.length > 0) {
      console.log(
        chalk.yellow(`\nNot recognised (ignored): ${schema.unrecognized.join(', ')}`),
      );
      console.log(chalk.dim('  Auto-Architect matches a fixed keyword list; see the README.'));
    }

    try {
      scaffoldProject(schema, options.dir, { dryRun: options.dryRun });
    } catch (error) {
      console.error(chalk.red('\nFailed to generate project.'));
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    }
  });

program.parse();

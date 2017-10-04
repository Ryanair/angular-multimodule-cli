import * as fs from 'fs';
import * as ora from 'ora';

export function getPath(template: string): string {
  return `${__dirname}/../templates/${template}`;
}

export async function execTask(title: string, task: any) {
  const spinner = ora(title);
  try {
    spinner.start();

    await task();

    spinner.succeed();
  } catch (e) {
    console.error('\n' + e);
    spinner.fail();
    process.exit(1);
  }
}

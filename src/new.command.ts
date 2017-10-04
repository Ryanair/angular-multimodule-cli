import {
  copy,
  ensureDir,
  readFile,
  readJSON,
  writeFile,
  writeJson
} from 'fs-extra';
import * as inquirer from 'inquirer';
import { join } from 'path';

import { ActionArgs, ActionLogger } from './main.models';
import QUESTIONS from './new.questions';
import { execTask } from './utils';

const TEMPLATE_VARS = ['\\[SCOPE\\]', '\\[SCOPE_NOAT\\]', '\\[NAME\\]'];

const TEMPLATE_FILES = [
  'package.json',
  'build/index.ts',
  'CHANGELOG.md',
  'modules/core/package.json',
  'modules/core/README.md',
  'modules/core/rollup.config.js',
  'modules/core/tsconfig-build.json',
  'modules/feature/package.json',
  'modules/feature/README.md',
  'modules/feature/rollup.config.js',
  'modules/feature/tsconfig-build.json',
  'modules/feature/src/basket.module.ts'
];

/**
 * Replace occurencies of the KEY with the value passed
 */
async function replace(filePath: string, KEY: string, value: string) {
  const index = await readFile(filePath, 'utf8');
  const regex = new RegExp(`${KEY}`, 'g');
  const res = index.replace(regex, value);
  return writeFile(filePath, res);
}

/**
 * Replace occurencies of all the TEMPLATE_VARS inside a file
 * with the matching values passed.
 */
async function replaceForFile(filePath: string, values: string[]) {
  return TEMPLATE_VARS.reduce(
    (promise, key, index) =>
      promise.then(() => replace(filePath, key, values[index])),
    Promise.resolve()
  );
}

export async function newCommand(
  args: ActionArgs,
  options: {},
  logger: ActionLogger
) {
  await execTask(`Create directory ${args.name}`, () => ensureDir(args.name));

  await execTask(`Copy files into ${args.name}`, () =>
    copy(`${__dirname}/../templates/project`, args.name)
  );

  const answers = await inquirer.prompt(QUESTIONS);

  const values = [answers.scope, answers.scope.replace('@', ''), args.name];

  await execTask('Replace templates', () =>
    Promise.all(
      TEMPLATE_FILES.map(file => replaceForFile(join(args.name, file), values))
    )
  );
}

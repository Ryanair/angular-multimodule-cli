import * as prog from 'caporal';
import * as pkg from '../package.json';

import { newCommand } from './new.command';

prog
  .version((pkg as any).version)
  .command('new', 'Create a new project')
  .argument('<name>')
  .action(newCommand);

prog.parse(process.argv);

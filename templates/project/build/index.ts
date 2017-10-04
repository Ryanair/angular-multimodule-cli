/* tslint:disable */

import build from './builder';
import { packages } from './config';

build({
  scope: '[SCOPE]',
  packages
}).catch(err => {
  console.error(err);
  process.exit(1);
});

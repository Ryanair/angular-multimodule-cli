export default {
  entry: './dist/feature/[SCOPE]/feature.es5.js',
  dest: './dist/feature/bundles/feature.umd.js',
  format: 'umd',
  exports: 'named',
  moduleName: '[SCOPE_NOAT].feature',
  globals: {
    '@angular/core': 'ng.core',
    '[SCOPE]/core': '[SCOPE_NOAT].core',
    'rxjs/Observable': 'Rx'
  }
};

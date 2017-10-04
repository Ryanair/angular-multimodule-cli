export default {
  entry: './dist/core/[SCOPE]/core.es5.js',
  dest: './dist/core/bundles/core.umd.js',
  format: 'umd',
  exports: 'named',
  moduleName: '[SCOPE_NOAT].core',
  globals: {
    '@angular/core': 'ng.core',
    'rxjs/Observable': 'Rx'
  }
};

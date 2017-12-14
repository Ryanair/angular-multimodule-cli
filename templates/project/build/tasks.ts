/* tslint:disable */

import { join, dirname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { Config } from './config';
import { ncp } from 'ncp';
import * as util from './util';
import { inlineResourcesFromString } from './inline';

/**
 * Cleans the top level dist folder. All npm-ready packages are created
 * in the dist folder.
 */
export function removeFolder(folder: string) {
  return function(config: Config) {
    return util.exec('rimraf', [folder]);
  };
}
/**
 * Uses the 'tsconfig-build.json' file in each package directory to produce
 * AOT and Closure compatible JavaScript
 */
export async function compilePackagesWithNgc(config: Config) {
  const pkgs = util.getTopLevelPackages(config);
  const testPkgs = util.getTestingPackages(config);

  await pkgs.reduce((promise, pkg) => {
    return promise.then(() => _compilePackagesWithNgc(pkg));
  }, Promise.resolve());
  await mapAsync(testPkgs, _compilePackagesWithNgc);
}

async function _compilePackagesWithNgc(pkg: string) {
  await util.exec('ngc', [`-p ./.tmp/${pkg}/tsconfig-build.json`]);

  /**
   * Test modules are treated differently because nested inside top-level.
   * This step removes the top-level package from testing modules from the
   * export statement.
   * Also changes the module name from 'index' to 'testing'
   * i.e. export * from './effects/testing/index' becomes './testing/testing';
   *
   * See https://github.com/ngrx/platform/issues/94
   */
  let [exportPath, moduleName] = /\/testing$/.test(pkg)
    ? [pkg.replace(/(.*\/)testing/i, 'testing'), 'testing']
    : [pkg, 'index'];

  const entryTypeDefinition = `export * from './${exportPath}/${moduleName}';`;
  const entryMetadata = `{"__symbolic":"module","version":3,"metadata":{},"exports":[{"from":"./${pkg}/index"}]}`;

  await Promise.all([
    util.writeFile(`./dist/packages/${pkg}.d.ts`, entryTypeDefinition),
    util.writeFile(`./dist/packages/${pkg}.metadata.json`, entryMetadata)
  ]);
}

/**
 * Uses Rollup to bundle the JavaScript into a single flat file called
 * a FESM (Flat Ecma Script Module)
 */
export async function bundleFesms(config: Config) {
  const pkgs = util.getAllPackages(config);

  await mapAsync(pkgs, async pkg => {
    const topLevelName = util.getTopLevelName(pkg);

    await util.exec('rollup', [
      `-i ./dist/packages/${pkg}/index.js`,
      `-o ./dist/${topLevelName}/${config.scope}/${pkg}.js`,
      `-f es`,
      `--sourcemap`
    ]);

    await util.mapSources(`./dist/${topLevelName}/${config.scope}/${pkg}.js`);
  });
}

/**
 * Copies each FESM into a TS file then uses TypeScript to downlevel
 * the FESM into ES5 with ESM modules
 */
export async function downLevelFesmsToES5(config: Config) {
  const packages = util.getAllPackages(config);
  const tscArgs = ['--target es5', '--module es2015', '--noLib', '--sourceMap'];

  await mapAsync(packages, async pkg => {
    const topLevelName = util.getTopLevelName(pkg);

    const file = `./dist/${topLevelName}/${config.scope}/${pkg}.js`;
    const target = `./dist/${topLevelName}/${config.scope}/${pkg}.es5.ts`;

    await util.copy(file, target);
    await util.ignoreErrors(util.exec('tsc', [target, ...tscArgs]));
    await util.mapSources(target.replace('.ts', '.js'));
    await util.remove(target);
  });

  await util.removeRecursively(`./dist/**/*/${config.scope}/*.ts`);
}

/**
 * Re-runs Rollup on the downleveled ES5 to produce a UMD bundle
 */
export async function createUmdBundles(config: Config) {
  await mapAsync(util.getAllPackages(config), async pkg => {
    const topLevelName = util.getTopLevelName(pkg);
    const destinationName = util.getDestinationName(pkg);

    const rollupArgs = [`-c ./modules/${pkg}/rollup.config.js`, `--sourcemap`];

    await util.exec('rollup', rollupArgs);
    await util.mapSources(
      `./dist/${topLevelName}/bundles/${destinationName}.umd.js`
    );
  });
}

/**
 * Removes any leftover TypeScript files from previous compilation steps,
 * leaving any type definition files in place
 */
export async function cleanTypeScriptFiles(config: Config) {
  const tsFilesGlob = './dist/packages/**/*.ts';
  const dtsFilesFlob = './dist/packages/**/*.d.ts';
  const filesToRemove = await util.getListOfFiles(tsFilesGlob, dtsFilesFlob);

  await mapAsync(filesToRemove, util.remove);
}

/**
 * Renames the index files in each package to the name
 * of the package.
 */
export async function renamePackageEntryFiles(config: Config) {
  await mapAsync(util.getAllPackages(config), async pkg => {
    const bottomLevelName = util.getBottomLevelName(pkg);

    const files = await util.getListOfFiles(`./dist/packages/${pkg}/index.**`);

    await mapAsync(files, async file => {
      const target = file.replace('index', bottomLevelName);

      await util.copy(file, target);
      await util.remove(file);
    });
  });
}

/**
 * Removes any remaining source map files from running NGC
 */
export async function removeRemainingSourceMapFiles(config: Config) {
  const packages = util.getTopLevelPackages(config);

  await util.removeRecursively(
    `./dist/packages/?(${packages.join('|')})/**/*.map`
  );
}

/**
 * Copies the type definition files and NGC metadata files to
 * the root of the distribution
 */
export async function copyTypeDefinitionFiles(config: Config) {
  const packages = util.getTopLevelPackages(config);
  const files = await util.getListOfFiles(
    `./dist/packages/?(${packages.join('|')})/**/*.*`
  );

  await mapAsync(files, async file => {
    const target = file.replace('packages/', '');
    await util.copy(file, target);
  });

  await util.removeRecursively(`./dist/packages/?(${packages.join('|')})`);
}

/**
 * Creates minified copies of each UMD bundle
 */
export async function minifyUmdBundles(config: Config) {
  const uglifyArgs = ['-c', '-m', '--comments'];

  await mapAsync(util.getAllPackages(config), async pkg => {
    const topLevelName = util.getTopLevelName(pkg);
    const destinationName = util.getDestinationName(pkg);
    const file = `./dist/${topLevelName}/bundles/${destinationName}.umd.js`;
    const out = `./dist/${topLevelName}/bundles/${destinationName}.umd.min.js`;

    return util.exec('uglifyjs', [
      file,
      ...uglifyArgs,
      `-o ${out}`,
      `--source-map "filename='${out}.map' includeSources='${file}', content='${file}.map'"`
    ]);
  });
}

/**
 * Copies the README.md, LICENSE, and package.json files into
 * each package
 */
export async function copyDocs(config: Config) {
  const packages = util.getTopLevelPackages(config);

  await mapAsync(packages, async pkg => {
    const source = `./modules/${pkg}`;
    const target = `./dist/${pkg}`;

    await Promise.all([
      util.copy(`${source}/README.md`, `${target}/README.md`)
    ]);
  });
}

export async function copyPackageJsonFiles(config: Config) {
  const packages = util.getAllPackages(config);

  await mapAsync(packages, async pkg => {
    const source = `./modules/${pkg}`;
    const target = `./dist/${pkg}`;

    await util.copy(`${source}/package.json`, `${target}/package.json`);
  });
}

/**
 * Removes the packages folder
 */
export async function removePackagesFolder(config: Config) {
  await util.removeRecursively('./dist/packages');
}

export function mapAsync<T>(
  list: T[],
  mapFn: (v: T, i: number) => Promise<any>
) {
  return Promise.all(list.map(mapFn));
}

export async function copySources(config: Config) {
  const pkgs = util.getTopLevelPackages(config);
  if (!existsSync('./.tmp')) {
    mkdirSync('./.tmp');
  }
  await mapAsync(pkgs, _copySources);
}

async function _copySources(pkg: string) {
  return new Promise((res, rej) => {
    ncp(`./modules/${pkg}`, `.tmp/${pkg}`, err => {
      if (err) {
        rej(err);
      }
      res();
    });
  });
}

export async function inlineResources(config: Config) {
  const pkgs = util.getTopLevelPackages(config);

  await mapAsync(pkgs, _inlineResources);
}

async function _inlineResources(pkg: String) {
  const files = await util.getListOfFiles(
    `./.tmp/${pkg}/src/**/*.component.ts`
  );

  return Promise.all(
    files.map(filePath => {
      return util
        .readFile(filePath, 'utf-8')
        .then(content =>
          inlineResourcesFromString(content as any, (url: any) => {
            // Resolve the template url.
            return join(dirname(filePath), url);
          })
        )
        .then(content => util.writeFile(filePath, content))
        .catch(err => {
          console.error('An error occured: ', err);
        });
    })
  );
}

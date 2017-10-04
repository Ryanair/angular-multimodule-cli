/* tslint:disable */

import * as util from './util';
import { readFileSync } from 'fs';
import * as sass from 'node-sass';
import * as tildeImporter from 'node-sass-tilde-importer';
import * as autoprefixer from 'autoprefixer';
import * as postcss from 'postcss';

/**
 * Inline resources from a string content.
 * @param content {string} The source file's content.
 * @param urlResolver {Function} A resolver that takes a URL and return a path.
 * @returns {string} The content with resources inlined.
 */
export function inlineResourcesFromString(
  content: string,
  urlResolver: any
): string {
  // Curry through the inlining functions.
  return [inlineTemplate, inlineStyle, removeModuleId].reduce(
    (content, fn) => fn(content, urlResolver),
    content
  );
}

/**
 * Inline the templates for a source file. Simply search for instances of `templateUrl: ...` and
 * replace with `template: ...` (with the content of the file included).
 * @param content {string} The source file's content.
 * @param urlResolver {Function} A resolver that takes a URL and return a path.
 * @return {string} The content with all templates inlined.
 */
export function inlineTemplate(content: string, urlResolver: any): string {
  return content.replace(/templateUrl:\s*'([^']+?\.html)'/g, function(
    m,
    templateUrl
  ) {
    const templateFile = urlResolver(templateUrl);
    const templateContent = readFileSync(templateFile, 'utf-8');
    const shortenedTemplate = templateContent
      .replace(/([\n\r]\s*)+/gm, ' ')
      .replace(/"/g, '\\"');
    return `template: "${shortenedTemplate}"`;
  });
}

/**
 * Inline the styles for a source file. Simply search for instances of `styleUrls: [...]` and
 * replace with `styles: [...]` (with the content of the file included).
 * @param urlResolver {Function} A resolver that takes a URL and return a path.
 * @param content {string} The source file's content.
 * @return {string} The content with all styles inlined.
 */
export function inlineStyle(content: string, urlResolver: any): string {
  return content.replace(/styleUrls\s*:\s*(\[[\s\S]*?\])/gm, function(
    m,
    styleUrls
  ) {
    const urls = eval(styleUrls);
    return (
      'styles: [' +
      urls
        .map((styleUrl: string) => {
          const styleFile = urlResolver(styleUrl);
          const originContent = readFileSync(styleFile, 'utf-8');
          const styleContent = originContent;
          // const styleContent = styleFile.endsWith('.scss')
          // ? buildSass(originContent, styleFile)
          // : originContent;
          const shortenedStyle = styleContent
            .replace(/([\n\r]\s*)+/gm, ' ')
            .replace(/"/g, '\\"');
          return `"${shortenedStyle}"`;
        })
        .join(',\n') +
      ']'
    );
  });
}

/**
 * build sass content to css
 * @param content {string} the css content
 * @param sourceFile {string} the scss file sourceFile
 * @return {string} the generated css, empty string if error occured
 */
export function buildSass(content: string, sourceFile: string) {
  try {
    const result = sass.renderSync({
      data: content,
      file: sourceFile,
      importer: tildeImporter
    });
    return postcss([
      autoprefixer({ browsers: ['> 1%', 'last 2 versions'] })
    ] as any).process(result.css.toString()).css;
  } catch (e) {
    console.error('\x1b[41m');
    console.error('at ' + sourceFile + ':' + e.line + ':' + e.column);
    console.error(e.formatted);
    console.error('\x1b[0m');
    return '';
  }
}

/**
 * Remove every mention of `moduleId: module.id`.
 * @param content {string} The source file's content.
 * @returns {string} The content with all moduleId: mentions removed.
 */
export function removeModuleId(content: string): string {
  return content.replace(/\s*moduleId:\s*module\.id\s*,?\s*/gm, '');
}

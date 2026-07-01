import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Returns the ADE package root directory.
 *
 * Resolves correctly in two contexts:
 *   - Local dev:  <project>/src/cli/packagePaths.ts → <project>/
 *   - Installed:  node_modules/ai-delivery-engine/src/cli/packagePaths.ts → node_modules/ai-delivery-engine/
 */
function getPackageRoot(): string {
  return resolve(__dirname, '../..');
}

/**
 * Absolute path to the ADE `templates/` directory.
 * Use this instead of `resolve(process.cwd(), 'templates')` so that
 * templates resolve correctly when ADE is installed as a devDependency.
 */
export function getTemplatesDir(): string {
  return resolve(getPackageRoot(), 'templates');
}

/**
 * Absolute path to the ADE `examples/` directory.
 * Useful for internal demo/validation commands that ship with ADE.
 */
export function getExamplesDir(): string {
  return resolve(getPackageRoot(), 'examples');
}

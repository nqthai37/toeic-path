import { cp, lstat, mkdir, realpath, rm } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = await realpath(fileURLToPath(new URL('../', import.meta.url)));
const sourceDirectory = join(projectRoot, 'src');
const outputDirectory = join(projectRoot, 'dist');

// Clean only this project's generated output. Never follow a linked output directory.
if (relative(projectRoot, outputDirectory) !== 'dist' || dirname(outputDirectory) !== projectRoot) {
  throw new Error('Build output must be the dist directory inside this project.');
}
const existingOutput = await lstat(outputDirectory).catch(error => {
  if (error.code !== 'ENOENT') throw error;
});
if (existingOutput?.isSymbolicLink() || (existingOutput && !existingOutput.isDirectory())) {
  throw new Error('Refusing to replace dist: the output path must be a regular directory.');
}
await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });
await cp(sourceDirectory, outputDirectory, { recursive: true });
console.log('Built src/ → dist/ (HTML, styles, scripts, and question data).');

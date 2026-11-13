import { cp, lstat, mkdir, realpath, readFile, writeFile, rm } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { createHash } from 'node:crypto';
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
// Version script and stylesheet URLs so Pages/browser caches cannot mix releases.
const htmlPath=join(outputDirectory,'index.html');
let html=await readFile(htmlPath,'utf8');
const assets=[...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map(match=>match[1]);
for(const asset of new Set(assets)){
 const version=createHash('sha256').update(await readFile(join(outputDirectory,asset))).digest('hex').slice(0,12);
 html=html.replaceAll(`"${asset}"`,`"${asset}?v=${version}"`);
}
await writeFile(htmlPath,html);
console.log('Built src/ → dist/ (HTML, styles, scripts, and question data).');

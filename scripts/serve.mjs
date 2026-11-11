import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const built = process.argv.includes('--built');
const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const directory = resolve(projectRoot, built ? 'dist' : 'src');
const port = Number(process.env.PORT || 4174);
const contentTypes = { '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json' };

if (built) {
  await readFile(resolve(directory, 'index.html')).catch(() => {
    throw new Error('Build output is missing. Run npm run build before npm run preview.');
  });
}

const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const filename = resolve(directory, '.' + (pathname === '/' ? '/index.html' : pathname));
    const relativePath = relative(directory, filename);
    if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
      response.writeHead(403).end('Forbidden');
      return;
    }
    const content = await readFile(filename);
    response.writeHead(200, {
      'Content-Type': contentTypes[extname(filename)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    response.end(content);
  } catch (error) {
    response.writeHead(error instanceof URIError ? 400 : 404).end('Not found');
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Serving ${built ? 'dist/' : 'src/'} at http://127.0.0.1:${port}`);
  console.log('Reload the browser after editing source files.');
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));

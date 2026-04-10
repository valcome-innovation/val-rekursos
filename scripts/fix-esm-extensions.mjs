import { readdir, readFile, writeFile } from 'fs/promises';
import { join, extname } from 'path';

async function fixImports(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      await fixImports(fullPath);
    } else if (entry.isFile() && extname(entry.name) === '.js') {
      let content = await readFile(fullPath, 'utf8');
      // Add .js to relative imports/exports that have no file extension
      const fixed = content.replace(
        /(from\s+['"])(\.{1,2}\/[^'"]+)(['"'])/g,
        (match, prefix, path, quote) => {
          if (!path.match(/\.(js|mjs|cjs|json)$/)) {
            return prefix + path + '.js' + quote;
          }
          return match;
        }
      );
      if (fixed !== content) {
        await writeFile(fullPath, fixed);
      }
    }
  }
}

await fixImports('./dist/esm');
console.log('ESM import extensions fixed.');

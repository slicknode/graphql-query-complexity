const { resolve } = require('path');
const { readdir, readFile, writeFile } = require('fs').promises;

async function* getFiles(dir) {
  const dirents = await readdir(dir, { withFileTypes: true });
  for (const dirent of dirents) {
    const res = resolve(dir, dirent.name);
    if (dirent.isDirectory()) {
      yield* getFiles(res);
    } else {
      yield res;
    }
  }
}

(async () => {
  for await (const f of getFiles('./dist/esm')) {
    if (!f.endsWith('.js')) continue;

    const fileContent = (await readFile(f)).toString();

    await writeFile(
      f,
      fileContent.replace(
        /(import .+ from) '(graphql\/.+)\.js';/g,
        "$1 '$2.mjs';"
      )
    );
  }
})();

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
  const buildOutput =
    process.argv.at(-1) === '--test' ? './dist/test/esm' : './dist/esm';
  for await (const f of getFiles(buildOutput)) {
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

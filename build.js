const { minify } = require('terser');
const fs = require('fs').promises;
const path = require('path');
const glob = require('glob');

async function buildScripts() {
    await fs.mkdir('dist', {recursive: true});

    const files = glob.sync('src/**/*.js');


    for(const file of files) {
        try {
            const code = await fs.readFile(file, 'utf-8');

            const minified = await minify(code, {
                compress: true,
                mangle: {toplevel: true},
            });

            const filename = path.basename(file)
            const outputPath = path.join('dist', filename.replace('.js', '.min.js'));

            await fs.writeFile(outputPath, minified.code);

            console.log(`✓ Minified ${filename}`);
        } catch (err) {
            console.error(`✗ Error processing ${file}:`, err);
        }
    }
}

buildScripts().catch(console.error);
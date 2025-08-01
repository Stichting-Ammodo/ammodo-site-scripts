const { minify } = require('terser');
const CleanCSS = require('clean-css');
const fs = require('fs').promises;
const path = require('path');
const glob = require('glob');

/**
 * Finds, minifies, and saves all JavaScript files from the src directory.
 */
async function buildJs() {
    // Find all .js files in the src directory and its subdirectories
    const files = glob.sync('src/**/*.js');
    console.log(`Found ${files.length} JavaScript file(s).`);

    // Create an array of promises for each file processing task
    const promises = files.map(async (file) => {
        try {
            const code = await fs.readFile(file, 'utf-8');

            // Minify the JavaScript code
            const minified = await minify(code, {
                compress: true,
                mangle: { toplevel: true },
            });

            const filename = path.basename(file);
            const outputPath = path.join('dist', filename.replace('.js', '.min.js'));

            // Write the minified code to the dist directory
            await fs.writeFile(outputPath, minified.code);
            console.log(`✓ Minified JS: ${filename}`);
        } catch (err) {
            console.error(`✗ Error processing JS file ${file}:`, err);
        }
    });

    // Wait for all file processing to complete
    await Promise.all(promises);
}

/**
 * Finds, minifies, and saves all CSS files from the src directory.
 */
async function buildCss() {
    // Find all .css files in the src directory and its subdirectories
    const files = glob.sync('src/**/*.css');
    console.log(`Found ${files.length} CSS file(s).`);

    const cleaner = new CleanCSS();

    // Create an array of promises for each file processing task
    const promises = files.map(async (file) => {
        try {
            const code = await fs.readFile(file, 'utf-8');

            // Minify the CSS code
            const minified = cleaner.minify(code);

            const filename = path.basename(file);
            const outputPath = path.join('dist', filename.replace('.css', '.min.css'));
            
            // Write the minified code to the dist directory
            await fs.writeFile(outputPath, minified.styles);
            console.log(`✓ Minified CSS: ${filename}`);
        } catch (err) {
            console.error(`✗ Error processing CSS file ${file}:`, err);
        }
    });

    // Wait for all file processing to complete
    await Promise.all(promises);
}

/**
 * Main build function to run all build tasks.
 */
async function build() {
    console.log('Starting build...');
    // Ensure the dist directory exists
    await fs.mkdir('dist', { recursive: true });

    // Run JavaScript and CSS builds in parallel
    await Promise.all([buildJs(), buildCss()]);

    console.log('Build finished successfully!');
}

// Run the build process and catch any top-level errors
build().catch(err => {
    console.error('✗ Build failed:', err);
    process.exit(1);
});
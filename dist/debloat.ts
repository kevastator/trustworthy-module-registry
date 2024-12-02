import * as fs from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import AdmZip from 'adm-zip';
import { execSync } from 'child_process';

function getTempDir() {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'debloat-'));
}

// Function to remove unnecessary files from the directory
export function removeUnnecessaryFiles(dir: string): void {
    const patternsToRemove = ['README.md', /\.test\.js$/, 'tests']; // Changed *.test.js to regex

    patternsToRemove.forEach((pattern) => {
        const files = fs.readdirSync(dir);
        files.forEach(file => {
            if (typeof pattern === 'string' ? file === pattern : file.match(pattern)) { // Check if pattern is string
                fs.removeSync(path.join(dir, file));
            }
        });
    });
    console.log('Unnecessary files removed.');
}


// Minification and tree-shaking
export function performTreeShakingAndMinification(dir: string): void {
    const webpackConfig = `
        const path = require('path');
        const TerserPlugin = require('terser-webpack-plugin');

        module.exports = {
            mode: 'production',
            entry: './dist/rate.ts',
            output: {
                filename: 'bundle.js',
                path: path.resolve('${dir}', 'dist')
            },
            resolve: {
                extensions: ['.ts', '.js'],
            },
            module: {
                rules: [
                    {
                        test: /\.ts$/,
                        use: 'ts-loader',
                        exclude: /node_modules/,
                    },
                ],
            },
            optimization: {
                minimize: true,
                minimizer: [new TerserPlugin()],
                usedExports: true
            }
        };
    `;
    fs.writeFileSync(`${dir}/webpack.config.js`, webpackConfig);
    execSync(`webpack --config ${dir}/webpack.config.js`, { cwd: dir });
    console.log('Tree shaking and minification complete.');
}

export function debloatPackage(zipFilePath: string, debloat: boolean): void {
    if (debloat) {
        const TEMP_DIR = getTempDir();
        const zip = new AdmZip(zipFilePath);
        zip.extractAllTo(TEMP_DIR, true);
    
        removeUnnecessaryFiles(TEMP_DIR);
        //performTreeShakingAndMinification(TEMP_DIR); // FOR NOW IGNORE THIS BECAUSE IT IS CAUSING PROBLEMS!!!!

        const newZip = new AdmZip();
        newZip.addLocalFolder(TEMP_DIR);
        const outputFile = zipFilePath.replace('.zip', '-debloated.zip');
        newZip.writeZip(outputFile);
    
        console.log(`Debloated package saved to ${outputFile}`);

        fs.removeSync(TEMP_DIR);
    }
}

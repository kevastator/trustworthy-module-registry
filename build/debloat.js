"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeUnnecessaryFiles = removeUnnecessaryFiles;
exports.performTreeShakingAndMinification = performTreeShakingAndMinification;
exports.debloatPackage = debloatPackage;
const fs = __importStar(require("fs-extra"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const adm_zip_1 = __importDefault(require("adm-zip"));
const child_process_1 = require("child_process");
function getTempDir() {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'debloat-'));
}
// Function to remove unnecessary files from the directory
function removeUnnecessaryFiles(dir) {
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
function performTreeShakingAndMinification(dir) {
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
    (0, child_process_1.execSync)(`webpack --config ${dir}/webpack.config.js`, { cwd: dir });
    console.log('Tree shaking and minification complete.');
}
function debloatPackage(zipFilePath, debloat) {
    if (debloat) {
        const TEMP_DIR = getTempDir();
        const zip = new adm_zip_1.default(zipFilePath);
        zip.extractAllTo(TEMP_DIR, true);
        removeUnnecessaryFiles(TEMP_DIR);
        performTreeShakingAndMinification(TEMP_DIR);
        const newZip = new adm_zip_1.default();
        newZip.addLocalFolder(TEMP_DIR);
        const outputFile = zipFilePath.replace('.zip', '-debloated.zip');
        newZip.writeZip(outputFile);
        console.log(`Debloated package saved to ${outputFile}`);
        fs.removeSync(TEMP_DIR);
    }
}

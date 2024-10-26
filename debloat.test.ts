import * as fs from 'fs-extra';
import * as path from 'path';
import { removeUnnecessaryFiles } from '../src/debloat.ts';

describe('removeUnnecessaryFiles', () => {
    let testDir: string;

    // Set up a temporary directory and files before each test
    beforeEach(() => {
        // Create a temporary directory for testing
        testDir = fs.mkdtempSync(path.join(__dirname, 'temp-'));

        // Create files and directories matching the patterns
        fs.writeFileSync(path.join(testDir, 'README.md'), 'Test README file');
        fs.writeFileSync(path.join(testDir, 'example.test.js'), 'console.log("test file");');
        fs.ensureDirSync(path.join(testDir, 'tests'));
        fs.writeFileSync(path.join(testDir, 'tests', 'testfile.js'), 'console.log("nested test file");');

        // Create files that should not be removed
        fs.writeFileSync(path.join(testDir, 'keep.js'), 'console.log("keep this file");');
    });

    // Clean up after each test
    afterEach(() => {
        fs.removeSync(testDir);
    });

    test('should remove README.md, .test.js files, and tests directory', () => {
        // Run the function to remove unnecessary files
        removeUnnecessaryFiles(testDir);

        // Check that the files have been removed
        expect(fs.existsSync(path.join(testDir, 'README.md'))).toBe(false);
        expect(fs.existsSync(path.join(testDir, 'example.test.js'))).toBe(false);
        expect(fs.existsSync(path.join(testDir, 'tests'))).toBe(false);

        // Check that the file not matching the pattern is still there
        expect(fs.existsSync(path.join(testDir, 'keep.js'))).toBe(true);
    });
});

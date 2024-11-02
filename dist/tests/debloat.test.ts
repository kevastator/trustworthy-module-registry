import * as fs from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import AdmZip from 'adm-zip';
import { debloatPackage } from '../debloat'; // Adjust the import based on your file structure

// Mock fs-extra module
jest.mock('fs-extra', () => ({
    mkdtempSync: jest.fn(),
    readdirSync: jest.fn(),
    removeSync: jest.fn(),
    writeFileSync: jest.fn(),
}));

// Mock AdmZip module
const mockExtractAllTo = jest.fn();
const mockWriteZip = jest.fn();

jest.mock('adm-zip', () => {
    return jest.fn().mockImplementation(() => ({
        extractAllTo: mockExtractAllTo,
        addLocalFolder: jest.fn(),
        writeZip: mockWriteZip, // This needs to be a mock function
    }));
});

// Mock child_process if used
jest.mock('child_process', () => ({
    execSync: jest.fn(),
}));

describe('debloatPackage', () => {
    const mockZipFilePath = 'path/to/mock.zip';
    const mockDebloatedZipFilePath = 'path/to/mock-debloated.zip';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should debloat a package and save the new zip file', () => {
        // Mocking fs functions
        (fs.mkdtempSync as jest.Mock).mockReturnValue(path.join(os.tmpdir(), 'debloat-123456'));
        (fs.readdirSync as jest.Mock).mockReturnValue(['README.md', 'file.js', 'tests']);
        
        // Call the debloatPackage function
        debloatPackage(mockZipFilePath, true);

        // Get the instance of the mocked AdmZip
        const zipInstance = new AdmZip(mockZipFilePath); // Create an instance using the mock

        // Check if unnecessary files were removed
        expect(fs.removeSync).toHaveBeenCalledWith(expect.stringContaining('README.md'));
        expect(fs.removeSync).toHaveBeenCalledWith(expect.stringContaining('tests'));
        expect(fs.writeFileSync).toHaveBeenCalledWith(expect.stringContaining('webpack.config.js'), expect.any(String));
        expect(mockWriteZip).toHaveBeenCalledWith(mockDebloatedZipFilePath); // Check the mockWriteZip
        expect(fs.removeSync).toHaveBeenCalledWith(expect.stringContaining('debloat-'));
    });

    it('should not debloat if debloat is false', () => {
        // Create an instance of AdmZip
        const zipInstance = new AdmZip(mockZipFilePath); // This creates a real instance of the mocked AdmZip

        // Call the function
        debloatPackage(mockZipFilePath, false);

        expect(mockExtractAllTo).not.toHaveBeenCalled(); // Ensure it is not called
    });
});

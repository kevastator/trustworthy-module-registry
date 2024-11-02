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
const fs = __importStar(require("fs-extra"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const adm_zip_1 = __importDefault(require("adm-zip"));
const debloat_1 = require("../debloat"); // Adjust the import based on your file structure
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
        fs.mkdtempSync.mockReturnValue(path.join(os.tmpdir(), 'debloat-123456'));
        fs.readdirSync.mockReturnValue(['README.md', 'file.js', 'tests']);
        // Call the debloatPackage function
        (0, debloat_1.debloatPackage)(mockZipFilePath, true);
        // Get the instance of the mocked AdmZip
        const zipInstance = new adm_zip_1.default(mockZipFilePath); // Create an instance using the mock
        // Check if unnecessary files were removed
        expect(fs.removeSync).toHaveBeenCalledWith(expect.stringContaining('README.md'));
        expect(fs.removeSync).toHaveBeenCalledWith(expect.stringContaining('tests'));
        expect(fs.writeFileSync).toHaveBeenCalledWith(expect.stringContaining('webpack.config.js'), expect.any(String));
        expect(mockWriteZip).toHaveBeenCalledWith(mockDebloatedZipFilePath); // Check the mockWriteZip
        expect(fs.removeSync).toHaveBeenCalledWith(expect.stringContaining('debloat-'));
    });
    it('should not debloat if debloat is false', () => {
        // Create an instance of AdmZip
        const zipInstance = new adm_zip_1.default(mockZipFilePath); // This creates a real instance of the mocked AdmZip
        // Call the function
        (0, debloat_1.debloatPackage)(mockZipFilePath, false);
        expect(mockExtractAllTo).not.toHaveBeenCalled(); // Ensure it is not called
    });
});

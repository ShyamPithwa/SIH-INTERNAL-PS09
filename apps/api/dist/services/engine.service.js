"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EngineService = void 0;
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const engine_schema_1 = require("../schemas/engine.schema");
class EngineService {
    getBinaryPath() {
        const configuredPath = process.env.ENGINE_BINARY_PATH || '../../engine/build/bess_engine.exe';
        // Resolve absolute path from current directory
        if (path_1.default.isAbsolute(configuredPath)) {
            return configuredPath;
        }
        // Resolve relative path from apps/api root
        return path_1.default.resolve(__dirname, '../../', configuredPath);
    }
    async runEngine(input) {
        const binaryPath = this.getBinaryPath();
        const timeoutMs = Number(process.env.ENGINE_TIMEOUT_MS || 5000);
        return new Promise((resolve, reject) => {
            console.log(`[C++ Engine Service] Spawning process: ${binaryPath}`);
            const child = (0, child_process_1.spawn)(binaryPath, [], {
                stdio: ['pipe', 'pipe', 'pipe'],
            });
            let stdout = '';
            let stderr = '';
            const timeout = setTimeout(() => {
                child.kill('SIGKILL');
                reject(new Error('ENGINE_TIMEOUT: Engine execution timed out'));
            }, timeoutMs);
            child.stdout.on('data', (chunk) => {
                stdout += chunk.toString();
            });
            child.stderr.on('data', (chunk) => {
                stderr += chunk.toString();
            });
            child.on('error', (err) => {
                clearTimeout(timeout);
                reject(new Error(`ENGINE_FAILURE: Failed to start C++ process: ${err.message}`));
            });
            child.on('close', (code) => {
                clearTimeout(timeout);
                if (code !== 0) {
                    reject(new Error(`ENGINE_FAILURE: Engine exited with code ${code}. Stderr: ${stderr}`));
                    return;
                }
                try {
                    const parsed = JSON.parse(stdout);
                    // Validate structure with Zod schema
                    const validated = engine_schema_1.EngineOutputSchema.parse(parsed);
                    if (!validated.ok) {
                        reject(new Error(`ENGINE_FAILURE: C++ engine reported error: ${validated.errorMessage || 'Unknown error'}`));
                        return;
                    }
                    resolve(validated);
                }
                catch (err) {
                    reject(new Error(`ENGINE_INVALID_RESPONSE: Failed to parse engine stdout. Raw output: ${stdout}. Parser error: ${err.message}`));
                }
            });
            // Write input JSON to stdin and close the stream
            try {
                child.stdin.write(JSON.stringify(input));
                child.stdin.end();
            }
            catch (err) {
                reject(new Error(`ENGINE_FAILURE: Failed to write to stdin: ${err.message}`));
            }
        });
    }
}
exports.EngineService = EngineService;
exports.default = EngineService;

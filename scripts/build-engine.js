const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('--- Starting BESS Engine Build ---');

// 1. Run setup script to download headers
try {
  execSync('node scripts/setup-engine.js', { stdio: 'inherit' });
} catch (e) {
  console.error('Failed to set up engine headers:', e);
  process.exit(1);
}

// 2. Ensure build directory exists
const buildDir = path.join(__dirname, '../engine/build');
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
}

// 3. Compile C++ engine
const sourceFiles = [
  'main.cpp',
  'matrix.cpp',
  'nla_functions.cpp',
  'factorizations.cpp',
  'polynomial_regression.cpp',
  'state_estimation.cpp',
  'performance_estimation.cpp',
  'grid_analysis.cpp',
  'decision_engine.cpp',
  'json_io.cpp'
].map(file => path.join(__dirname, '../engine/src', file));

const includePath = path.join(__dirname, '../engine/include');
const outputPath = path.join(buildDir, 'bess_engine.exe');

// Check if source directory exists before compiling
const srcDir = path.join(__dirname, '../engine/src');
if (!fs.existsSync(srcDir)) {
  console.log('Engine source files do not exist yet. Skipping actual compilation for scaffolding phase.');
  process.exit(0);
}

const compileCommand = `g++ -std=c++17 -I "${includePath}" ${sourceFiles.map(f => `"${f}"`).join(' ')} -o "${outputPath}"`;

console.log(`Executing compilation command:\n${compileCommand}`);

try {
  execSync(compileCommand, { stdio: 'inherit' });
  console.log('BESS Engine compiled successfully!');
} catch (error) {
  console.error('Compilation failed:', error.message);
  process.exit(1);
}

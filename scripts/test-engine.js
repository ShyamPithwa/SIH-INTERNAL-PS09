const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('--- Starting BESS Engine Tests ---');

// Run setup script to download headers
try {
  execSync('node scripts/setup-engine.js', { stdio: 'inherit' });
} catch (e) {
  console.error('Failed to set up engine headers:', e);
  process.exit(1);
}

const testDir = path.join(__dirname, '../engine/test');
if (!fs.existsSync(testDir)) {
  console.log('Engine test directory does not exist yet. Skipping tests.');
  process.exit(0);
}

const buildDir = path.join(__dirname, '../engine/build');
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
}

// Compile tests
const sourceFiles = [
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

const testFiles = [
  'test_main.cpp'
].map(file => path.join(testDir, file));

const includePath = path.join(__dirname, '../engine/include');
const testOutputPath = path.join(buildDir, 'bess_engine_test.exe');

const compileCommand = `g++ -std=c++17 -I "${includePath}" ${sourceFiles.map(f => `"${f}"`).join(' ')} ${testFiles.map(f => `"${f}"`).join(' ')} -o "${testOutputPath}"`;

console.log(`Compiling C++ tests:\n${compileCommand}`);

try {
  execSync(compileCommand, { stdio: 'inherit' });
  console.log('C++ tests compiled successfully. Running tests...');
  
  // Run tests
  execSync(`"${testOutputPath}"`, { stdio: 'inherit' });
  console.log('C++ tests executed successfully!');
} catch (error) {
  console.error('Test execution failed:', error.message);
  process.exit(1);
}

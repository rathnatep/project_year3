const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Load environment variables
require('dotenv').config();

const backendDir = path.join(__dirname, '..');
const serverFile = path.join(backendDir, 'server', 'index.ts');

console.log('🚀 Starting Backend Server...');
console.log('📁 Working Directory:', backendDir);
console.log('🔧 Environment:', process.env.NODE_ENV || 'development');

// Check if .env file exists
const envFile = path.join(backendDir, '.env');
if (!fs.existsSync(envFile)) {
  console.log('⚠️  Warning: .env file not found. Using default configuration.');
  console.log('💡 Copy .env.example to .env and configure your settings.');
}

// Start the backend server
const backend = spawn('npx', ['tsx', serverFile], {
  cwd: backendDir,
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: process.env.NODE_ENV || 'development',
  },
});

backend.on('error', (error) => {
  console.error('❌ Failed to start backend:', error.message);
  process.exit(1);
});

backend.on('close', (code) => {
  console.log(`Backend process exited with code ${code}`);
  process.exit(code);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down backend server...');
  backend.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down backend server...');
  backend.kill('SIGTERM');
});
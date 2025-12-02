const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', 'client', '.env') });

const clientDir = path.join(__dirname, '..', 'client');

console.log('🚀 Starting Frontend Development Server...');
console.log('📁 Working Directory:', clientDir);
console.log('🔧 Environment:', process.env.NODE_ENV || 'development');

// Check if .env file exists
const envFile = path.join(clientDir, '.env');
if (!fs.existsSync(envFile)) {
  console.log('⚠️  Warning: .env file not found in client directory.');
  console.log('💡 Copy client/.env.example to client/.env and configure your settings.');
}

// Check if node_modules exists
const nodeModulesDir = path.join(clientDir, 'node_modules');
if (!fs.existsSync(nodeModulesDir)) {
  console.log('📦 Installing frontend dependencies...');
  const install = spawn('npm', ['install'], {
    cwd: clientDir,
    stdio: 'inherit',
  });

  install.on('error', (error) => {
    console.error('❌ Failed to install dependencies:', error.message);
    process.exit(1);
  });

  install.on('close', (code) => {
    if (code !== 0) {
      console.error('❌ Dependency installation failed');
      process.exit(code);
    }
    startFrontend();
  });
} else {
  startFrontend();
}

function startFrontend() {
  // Start the frontend development server
  const frontend = spawn('npm', ['run', 'dev'], {
    cwd: clientDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: process.env.NODE_ENV || 'development',
      VITE_API_URL: process.env.VITE_API_URL || 'http://localhost:5000',
    },
  });

  frontend.on('error', (error) => {
    console.error('❌ Failed to start frontend:', error.message);
    process.exit(1);
  });

  frontend.on('close', (code) => {
    console.log(`Frontend process exited with code ${code}`);
    process.exit(code);
  });

  // Handle process termination
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down frontend server...');
    frontend.kill('SIGINT');
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down frontend server...');
    frontend.kill('SIGTERM');
  });
}
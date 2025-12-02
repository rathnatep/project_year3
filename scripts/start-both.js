const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Full Application (Backend + Frontend)...');

const scriptDir = __dirname;

// Start backend
const backend = spawn('node', [path.join(scriptDir, 'start-backend.js')], {
  stdio: ['inherit', 'pipe', 'pipe'],
  env: process.env,
});

// Start frontend after a short delay
setTimeout(() => {
  const frontend = spawn('node', [path.join(scriptDir, 'start-frontend.js')], {
    stdio: ['inherit', 'pipe', 'pipe'],
    env: process.env,
  });

  frontend.on('error', (error) => {
    console.error('❌ Failed to start frontend:', error.message);
    backend.kill();
    process.exit(1);
  });

  frontend.on('close', (code) => {
    console.log(`Frontend process exited with code ${code}`);
    backend.kill();
    process.exit(code);
  });

  // Handle frontend output
  frontend.stdout.on('data', (data) => {
    process.stdout.write(data);
  });

  frontend.stderr.on('data', (data) => {
    process.stderr.write(data);
  });

}, 2000); // Wait 2 seconds before starting frontend

backend.on('error', (error) => {
  console.error('❌ Failed to start backend:', error.message);
  process.exit(1);
});

backend.on('close', (code) => {
  console.log(`Backend process exited with code ${code}`);
  process.exit(code);
});

// Handle backend output
backend.stdout.on('data', (data) => {
  process.stdout.write(data);
});

backend.stderr.on('data', (data) => {
  process.stderr.write(data);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down both servers...');
  backend.kill('SIGINT');
  setTimeout(() => {
    process.exit(0);
  }, 1000);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down both servers...');
  backend.kill('SIGTERM');
  setTimeout(() => {
    process.exit(0);
  }, 1000);
});
const fs = require('fs');
const path = require('path');

console.log('🔧 Setting up Classroom Management System...\n');

const projectRoot = path.join(__dirname, '..');

// Check and create environment files
console.log('📝 Setting up environment files...');

// Backend .env
const backendEnvPath = path.join(projectRoot, '.env');
const backendEnvExample = path.join(projectRoot, '.env.example');
if (!fs.existsSync(backendEnvPath) && fs.existsSync(backendEnvExample)) {
  fs.copyFileSync(backendEnvExample, backendEnvPath);
  console.log('✅ Created .env file from template');
} else if (fs.existsSync(backendEnvPath)) {
  console.log('✅ Backend .env file already exists');
} else {
  console.log('❌ Backend .env.example not found');
}

// Frontend .env
const frontendEnvPath = path.join(projectRoot, 'client', '.env');
const frontendEnvExample = path.join(projectRoot, 'client', '.env.example');
if (!fs.existsSync(frontendEnvPath) && fs.existsSync(frontendEnvExample)) {
  fs.copyFileSync(frontendEnvExample, frontendEnvPath);
  console.log('✅ Created client/.env file from template');
} else if (fs.existsSync(frontendEnvPath)) {
  console.log('✅ Frontend .env file already exists');
} else {
  console.log('❌ Frontend .env.example not found');
}

// Create necessary directories
console.log('\n📁 Creating necessary directories...');

const directories = [
  'data',
  'uploads',
  'client/dist',
];

directories.forEach(dir => {
  const dirPath = path.join(projectRoot, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`✅ Created ${dir}/ directory`);
  } else {
    console.log(`✅ ${dir}/ directory already exists`);
  }
});

// Check package.json files
console.log('\n📦 Checking package.json files...');

const packageFiles = [
  { name: 'Backend', path: path.join(projectRoot, 'package.json') },
  { name: 'Frontend', path: path.join(projectRoot, 'client', 'package.json') },
];

packageFiles.forEach(({ name, path: pkgPath }) => {
  if (fs.existsSync(pkgPath)) {
    console.log(`✅ ${name} package.json exists`);
  } else {
    console.log(`❌ ${name} package.json not found`);
  }
});

// Check configuration files
console.log('\n⚙️ Checking configuration files...');

const configFiles = [
  { name: 'Database Config', path: path.join(projectRoot, 'config', 'database.ts') },
  { name: 'Server Config', path: path.join(projectRoot, 'config', 'server.ts') },
  { name: 'API Config', path: path.join(projectRoot, 'config', 'api.ts') },
];

configFiles.forEach(({ name, path: configPath }) => {
  if (fs.existsSync(configPath)) {
    console.log(`✅ ${name} exists`);
  } else {
    console.log(`❌ ${name} not found`);
  }
});

// Check startup scripts
console.log('\n🚀 Checking startup scripts...');

const scriptFiles = [
  { name: 'Backend Startup', path: path.join(projectRoot, 'scripts', 'start-backend.js') },
  { name: 'Frontend Startup', path: path.join(projectRoot, 'scripts', 'start-frontend.js') },
  { name: 'Both Services Startup', path: path.join(projectRoot, 'scripts', 'start-both.js') },
];

scriptFiles.forEach(({ name, path: scriptPath }) => {
  if (fs.existsSync(scriptPath)) {
    console.log(`✅ ${name} exists`);
  } else {
    console.log(`❌ ${name} not found`);
  }
});

console.log('\n🎉 Setup complete!');
console.log('\nNext steps:');
console.log('1. Review and update your .env files with your configuration');
console.log('2. Install dependencies: npm run install:all');
console.log('3. Start the application: npm run start:both');
console.log('\nFor detailed instructions, see README.md');
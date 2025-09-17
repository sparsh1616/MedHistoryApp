#!/usr/bin/env node

/**
 * MedHistoryApp Deployment Helper
 *
 * This script helps with deploying the application to Render.
 * Run this script to check if your environment is ready for deployment.
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 MedHistoryApp Deployment Helper\n');

// Check if package.json has start script
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
if (!packageJson.scripts || !packageJson.scripts.start) {
  console.log('❌ Missing start script in package.json');
  console.log('   Please add: "start": "node server.js" to your scripts section');
  process.exit(1);
} else {
  console.log('✅ Start script found in package.json');
}

// Check if render.yaml exists
if (fs.existsSync('render.yaml')) {
  console.log('✅ render.yaml configuration file found');
} else {
  console.log('❌ render.yaml not found');
  console.log('   Please ensure render.yaml is in the root directory');
  process.exit(1);
}

// Check if .env.example exists
if (fs.existsSync('.env.example')) {
  console.log('✅ Environment variables template (.env.example) found');
} else {
  console.log('⚠️  .env.example not found - consider creating one for documentation');
}

// Check if README.md exists
if (fs.existsSync('README.md')) {
  console.log('✅ README.md found');
} else {
  console.log('⚠️  README.md not found - consider creating deployment documentation');
}

// Check server.js for required environment variables
const serverContent = fs.readFileSync('server.js', 'utf8');
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET', 'GROQ_API_KEY'];

console.log('\n🔍 Checking for required environment variables in server.js:');
requiredEnvVars.forEach(envVar => {
  if (serverContent.includes(envVar)) {
    console.log(`✅ ${envVar} is referenced in server.js`);
  } else {
    console.log(`❌ ${envVar} is not found in server.js`);
  }
});

// Check if public directory exists
if (fs.existsSync('public')) {
  console.log('✅ Public directory found');
} else {
  console.log('❌ Public directory not found');
  process.exit(1);
}

// Check for required files in public
const requiredPublicFiles = ['index.html', 'script.js', 'styles.css'];
requiredPublicFiles.forEach(file => {
  if (fs.existsSync(path.join('public', file))) {
    console.log(`✅ public/${file} found`);
  } else {
    console.log(`❌ public/${file} not found`);
  }
});

console.log('\n📋 Deployment Checklist:');
console.log('1. ✅ Push your code to GitHub');
console.log('2. 🔗 Connect your GitHub repo to Render (https://dashboard.render.com)');
console.log('3. 🏗️  Render will automatically detect render.yaml and deploy');
console.log('4. 🔑 Set the GROQ_API_KEY in Render environment variables');
console.log('5. 🗄️  Render will create PostgreSQL database automatically');
console.log('6. 🌐 Your app will be live at the provided Render URL');

console.log('\n🎉 Your MedHistoryApp is ready for deployment!');
console.log('\n📖 For detailed instructions, see README.md');
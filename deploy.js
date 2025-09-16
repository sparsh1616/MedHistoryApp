#!/usr/bin/env node

/**
 * MedHistoryApp Deployment Script
 * This script helps deploy the application to various platforms
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 MedHistoryApp Deployment Script');
console.log('==================================\n');

// Check if .env file exists
if (!fs.existsSync('.env')) {
    console.log('❌ .env file not found!');
    console.log('Please create a .env file based on .env.example');
    console.log('Copy .env.example to .env and fill in your values\n');
    process.exit(1);
}

// Check required environment variables
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
    console.log('❌ Missing required environment variables:');
    missingVars.forEach(varName => console.log(`   - ${varName}`));
    console.log('Please set these in your .env file\n');
    process.exit(1);
}

console.log('✅ Environment configuration looks good\n');

// Function to run commands
function runCommand(command, description) {
    try {
        console.log(`🔄 ${description}...`);
        execSync(command, { stdio: 'inherit' });
        console.log(`✅ ${description} completed\n`);
    } catch (error) {
        console.log(`❌ ${description} failed:`, error.message);
        process.exit(1);
    }
}

// Install dependencies
runCommand('npm install', 'Installing dependencies');

// Test the application
console.log('🧪 Testing application...');
try {
    // Simple syntax check
    require('./server.js');
    console.log('✅ Server syntax is valid');
} catch (error) {
    console.log('❌ Server has syntax errors:', error.message);
    process.exit(1);
}

console.log('\n🎉 Application is ready for deployment!');
console.log('\n📋 Deployment Options:');
console.log('1. Local Development: npm run dev');
console.log('2. Production Local: npm run prod');
console.log('3. Deploy to Railway: railway deploy');
console.log('4. Deploy to Heroku: git push heroku main');
console.log('5. Deploy to Vercel: vercel --prod');
console.log('\n📖 Check README.md for detailed deployment instructions');
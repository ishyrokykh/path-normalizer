#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');

// Get current version from package.json
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const version = packageJson.version;

// Read changelog
const changelog = fs.readFileSync('CHANGELOG.md', 'utf8');

// Extract changelog section for current version
const versionRegex = new RegExp(`## \\[${version}\\][\\s\\S]*?(?=## \\[|$)`);
const match = changelog.match(versionRegex);

if (!match) {
  console.error(`❌ No changelog found for version ${version}`);
  process.exit(1);
}

// Clean up the changelog content (remove the header line)
let releaseNotes = match[0];
releaseNotes = releaseNotes.replace(/^## \[.*?\] - .*?\n\n/, '');

// Get the latest commit message for the title
let commitMessage;
try {
  commitMessage = execSync('git log -1 --pretty=%s', { encoding: 'utf8' }).trim();
} catch (error) {
  commitMessage = `Release ${version}`;
}

// Create the release
const title = `v${version} - ${commitMessage}`;
const tempFile = '/tmp/release-notes.md';

try {
  // Write release notes to temp file
  fs.writeFileSync(tempFile, releaseNotes);
  
  // Create GitHub release
  const command = `gh release create v${version} --title "${title}" --notes-file ${tempFile}`;
  console.log(`🚀 Creating GitHub release: ${title}`);
  console.log(`📝 Using changelog content for version ${version}`);
  
  execSync(command, { stdio: 'inherit' });
  
  // Clean up temp file
  fs.unlinkSync(tempFile);
  
  console.log(`✅ GitHub release created successfully: v${version}`);
} catch (error) {
  console.error('❌ Failed to create GitHub release:', error.message);
  process.exit(1);
}

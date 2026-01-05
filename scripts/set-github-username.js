const fs = require('fs');
const path = require('path');

const USERNAME = process.argv[2];

if (!USERNAME) {
    console.error('Please provide your GitHub username as an argument.');
    console.error('Usage: node scripts/set-github-username.js <your-username>');
    process.exit(1);
}

const FILES_TO_UPDATE = [
    path.join(__dirname, '../src/assets/addons.json'),
    path.join(__dirname, '../scripts/rewrite-github-links.js')
];

const DIRS_TO_UPDATE = [
    path.join(__dirname, '../_backup_addons'),
    path.join(__dirname, '../src/assets/addons_data')
];

function replaceInFile(filePath) {
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        if (content.includes('YOUR_USERNAME')) {
            content = content.replace(/YOUR_USERNAME/g, USERNAME);
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`Updated ${filePath}`);
        }
    }
}

function replaceInDir(dirPath) {
    if (!fs.existsSync(dirPath)) return;
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
        const fullPath = path.join(dirPath, file);
        if (fs.statSync(fullPath).isDirectory()) {
            replaceInDir(fullPath);
        } else if (file.endsWith('.json') || file === 'README.md') {
            replaceInFile(fullPath);
        }
    }
}

console.log(`Replacing 'YOUR_USERNAME' with '${USERNAME}'...`);

FILES_TO_UPDATE.forEach(replaceInFile);
DIRS_TO_UPDATE.forEach(replaceInDir);

console.log('Done! Please run "node scripts/build-addons.js" to ensure everything is consistent.');

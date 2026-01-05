const fs = require('fs');
const path = require('path');

const BACKUP_DIR = path.join(__dirname, '../_backup_addons');

function sanitizeContent(content) {
    let newContent = content;

    // List of terms to remove or replace
    // We use a more aggressive approach now
    
    // 1. World of Warcraft -> Azeroth Legacy
    newContent = newContent.replace(/World of Warcraft/gi, 'Azeroth Legacy');
    newContent = newContent.replace(/WoW/g, 'Game'); // Case sensitive for WoW to avoid replacing words like "wow" (exclamation) - though usually safe in this context, let's be careful or just replace all "WoW" with "Game" or "Client"
    
    // 2. Expansions
    // WotLK
    newContent = newContent.replace(/Wrath of the Lich King/gi, '3.3.5');
    newContent = newContent.replace(/WotLK/gi, '3.3.5');
    
    // TBC
    newContent = newContent.replace(/The Burning Crusade/gi, '2.4.3');
    newContent = newContent.replace(/Burning Crusade/gi, '2.4.3');
    newContent = newContent.replace(/TBC/gi, '2.4.3');
    
    // Vanilla / Classic
    // Be careful with "Classic" as it might refer to the new Classic. 
    // But for this mirror, it means 1.12.1 usually.
    newContent = newContent.replace(/Vanilla/gi, '1.12.1');
    
    // 3. Clean up resulting artifacts
    // e.g. "3.3.5 (3.3.5)" -> "3.3.5"
    newContent = newContent.replace(/3\.3\.5\s*\(3\.3\.5\)/g, '3.3.5');
    newContent = newContent.replace(/2\.4\.3\s*\(2\.4\.3\)/g, '2.4.3');
    newContent = newContent.replace(/1\.12\.1\s*\(1\.12\.1\)/g, '1.12.1');
    
    // Remove empty parentheses ()
    newContent = newContent.replace(/\(\s*\)/g, '');
    
    // Fix double spaces
    newContent = newContent.replace(/  +/g, ' ');
    
    return newContent;
}

function processDirectory(directory) {
    if (!fs.existsSync(directory)) {
        console.log(`Directory not found: ${directory}`);
        return;
    }

    const items = fs.readdirSync(directory);

    for (const item of items) {
        const fullPath = path.join(directory, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            processDirectory(fullPath);
        } else if (item.toLowerCase() === 'readme.md') {
            const content = fs.readFileSync(fullPath, 'utf8');
            const sanitized = sanitizeContent(content);
            if (content !== sanitized) {
                fs.writeFileSync(fullPath, sanitized, 'utf8');
                // console.log(`Sanitized: ${fullPath}`); // Silence output to be faster
            }
        }
    }
}

console.log('Starting Aggressive README sanitization...');
processDirectory(BACKUP_DIR);
console.log('Sanitization complete.');

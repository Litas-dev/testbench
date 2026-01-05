const fs = require('fs');
const path = require('path');
// Use the \\?\ prefix to handle potentially problematic paths on Windows
const oldPath = '\\\\?\\' + path.join(__dirname, '..', '_backup_addons', 'aux');
const newPath = path.join(__dirname, '..', '_backup_addons', 'aux-addon');

console.log(`Renaming ${oldPath} to ${newPath}`);

try {
    if (fs.existsSync(oldPath)) {
        fs.renameSync(oldPath, newPath);
        console.log('Renamed aux to aux-addon');
    } else {
        console.log('Path does not exist (or cannot be accessed)');
        // Try without prefix just in case
        const simpleOldPath = path.join(__dirname, '_backup_addons', 'aux');
        if (fs.existsSync(simpleOldPath)) {
             fs.renameSync(simpleOldPath, newPath);
             console.log('Renamed aux to aux-addon (simple path)');
        }
    }
} catch (e) {
    console.error('Error renaming:', e);
}

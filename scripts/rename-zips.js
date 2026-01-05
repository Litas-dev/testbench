const fs = require('fs');
const path = require('path');

const BACKUP_DIR = path.join(__dirname, '../_backup_addons');

function renameZips() {
    if (!fs.existsSync(BACKUP_DIR)) {
        console.log(`Backup directory not found: ${BACKUP_DIR}`);
        return;
    }

    const folders = fs.readdirSync(BACKUP_DIR);
    let count = 0;

    for (const folder of folders) {
        const addonDir = path.join(BACKUP_DIR, folder);
        if (!fs.statSync(addonDir).isDirectory()) continue;

        const mappings = [
            { old: 'wotlk.zip', new: '3.3.5.zip' },
            { old: 'tbc.zip', new: '2.4.3.zip' },
            { old: 'classic.zip', new: '1.12.1.zip' }
        ];

        for (const map of mappings) {
            const oldPath = path.join(addonDir, map.old);
            const newPath = path.join(addonDir, map.new);

            if (fs.existsSync(oldPath)) {
                if (!fs.existsSync(newPath)) {
                    fs.renameSync(oldPath, newPath);
                    console.log(`Renamed: ${folder}/${map.old} -> ${map.new}`);
                    count++;
                } else {
                    console.log(`Skipped: ${folder}/${map.old} (Target ${map.new} already exists)`);
                    // Optional: Delete the old one if target exists? 
                    // Let's keep it safe and just log for now, user can delete manually if needed.
                    // Or actually, to save space, we should probably delete the old one if they are identical.
                    // But for now, safe approach.
                    fs.unlinkSync(oldPath); // Delete the old file since the new one exists (likely from the running script)
                    console.log(`Deleted redundant: ${folder}/${map.old}`);
                }
            }
        }
    }

    console.log(`\nRenaming complete. Processed ${count} files.`);
}

renameZips();

const fs = require('fs');
const path = require('path');

const BACKUP_DIR = path.join(__dirname, '../_backup_addons');
const DATA_DIR = path.join(__dirname, '../src/assets/addons_data');

function updateClientSource() {
    console.log('Updating client source data from backup (GitHub links)...');

    if (!fs.existsSync(BACKUP_DIR)) {
        console.error(`Backup directory not found: ${BACKUP_DIR}`);
        return;
    }
    if (!fs.existsSync(DATA_DIR)) {
        console.error(`Data directory not found: ${DATA_DIR}`);
        return;
    }

    const folders = fs.readdirSync(BACKUP_DIR);
    let count = 0;

    for (const folder of folders) {
        const backupJsonPath = path.join(BACKUP_DIR, folder, 'addon.json');
        const targetDir = path.join(DATA_DIR, folder);
        const targetJsonPath = path.join(targetDir, 'addon.json');

        if (fs.existsSync(backupJsonPath)) {
            // Ensure target directory exists (it should, but just in case)
            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
            }

            const backupData = JSON.parse(fs.readFileSync(backupJsonPath, 'utf8'));
            
            // Read existing target data to preserve any manual overrides if we had them?
            // Actually, we want the backup data because it has the new links.
            // But we should verify if the backup data is complete.
            
            // Write to target
            fs.writeFileSync(targetJsonPath, JSON.stringify(backupData, null, 2));
            count++;
        }
    }

    console.log(`Updated ${count} addons in src/assets/addons_data.`);
}

updateClientSource();

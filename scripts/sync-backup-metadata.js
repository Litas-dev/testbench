const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../src/assets/addons_data');
const BACKUP_DIR = path.join(__dirname, '../_backup_addons');

function syncMetadata() {
    if (!fs.existsSync(DATA_DIR)) {
        console.error(`Data directory not found: ${DATA_DIR}`);
        return;
    }
    if (!fs.existsSync(BACKUP_DIR)) {
        console.error(`Backup directory not found: ${BACKUP_DIR}`);
        return;
    }

    const folders = fs.readdirSync(DATA_DIR);
    let count = 0;

    for (const folder of folders) {
        const sourceJsonPath = path.join(DATA_DIR, folder, 'addon.json');
        const backupFolder = path.join(BACKUP_DIR, folder);

        if (fs.existsSync(sourceJsonPath) && fs.existsSync(backupFolder)) {
            const addon = JSON.parse(fs.readFileSync(sourceJsonPath, 'utf8'));

            // 1. Copy addon.json
            fs.writeFileSync(path.join(backupFolder, 'addon.json'), JSON.stringify(addon, null, 2));

            // 2. Generate Rich README.md
            let readme = `# ${addon.title}\n\n`;
            
            // Logo
            const files = fs.readdirSync(backupFolder);
            const logo = files.find(f => f.startsWith('logo.'));
            if (logo) {
                readme += `<img src="${logo}" align="right" width="100">\n\n`;
            }

            readme += `${addon.description}\n\n`;
            readme += `## Metadata\n\n`;
            readme += `- **Author:** ${addon.author}\n`;
            readme += `- **Source:** [Original Link](${addon.source.url})\n`;
            
            readme += `\n## Supported Versions\n\n`;
            const versions = [];
            if (files.includes('3.3.5.zip')) versions.push('3.3.5 (WotLK)');
            if (files.includes('2.4.3.zip')) versions.push('2.4.3 (TBC)');
            if (files.includes('1.12.1.zip')) versions.push('1.12.1 (Vanilla)');
            
            if (versions.length > 0) {
                versions.forEach(v => readme += `- [x] ${v}\n`);
            } else {
                readme += `*No zip files found locally.*\n`;
            }

            // Screenshots
            const screenshots = files.filter(f => f.startsWith('screenshot_'));
            if (screenshots.length > 0) {
                readme += `\n## Screenshots\n\n`;
                readme += `<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">\n`;
                screenshots.forEach(shot => {
                    readme += `  <img src="${shot}" width="100%">\n`;
                });
                readme += `</div>\n`;
            }

            fs.writeFileSync(path.join(backupFolder, 'README.md'), readme);
            count++;
        }
    }

    console.log(`Synced metadata for ${count} addons.`);
}

syncMetadata();

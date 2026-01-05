const fs = require('fs');
const path = require('path');

const ADDONS_DIR = path.join(__dirname, '../src/assets/addons_data');

function fixReadmes() {
    if (!fs.existsSync(ADDONS_DIR)) {
        console.error(`Directory not found: ${ADDONS_DIR}`);
        return;
    }

    const folders = fs.readdirSync(ADDONS_DIR);
    let count = 0;

    for (const folder of folders) {
        const addonFile = path.join(ADDONS_DIR, folder, 'addon.json');
        if (fs.existsSync(addonFile)) {
            const addon = JSON.parse(fs.readFileSync(addonFile, 'utf8'));
            
            const readmeFile = path.join(ADDONS_DIR, folder, 'README.md');
            const readmeContent = `# ${addon.title}\n\n${addon.description}\n\nAuthor: ${addon.author}\nSource: ${addon.source.url}\n`;
            
            fs.writeFileSync(readmeFile, readmeContent);
            count++;
            
            if (folder === 'addonlist') {
                console.log(`Fixed AddonList README. Source: ${addon.source.url}`);
            }
        }
    }
    
    console.log(`Regenerated ${count} README files.`);
}

fixReadmes();
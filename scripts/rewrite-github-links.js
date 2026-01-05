const fs = require('fs');
const path = require('path');

const BACKUP_DIR = path.join(__dirname, '../_backup_addons');
// NOTE: You MUST update this URL to your actual GitHub username/repository
const GITHUB_BASE_URL = 'https://raw.githubusercontent.com/Litas-dev/Azeroth-Legacy-Addons-Mirror/main';
const GITHUB_TREE_URL = 'https://github.com/Litas-dev/Azeroth-Legacy-Addons-Mirror/tree/main';

function rewriteJsonLinks() {
    if (!fs.existsSync(BACKUP_DIR)) {
        console.error(`Backup directory not found: ${BACKUP_DIR}`);
        return;
    }

    const folders = fs.readdirSync(BACKUP_DIR);
    let count = 0;

    for (const folder of folders) {
        const addonDir = path.join(BACKUP_DIR, folder);
        const jsonPath = path.join(addonDir, 'addon.json');

        if (fs.existsSync(jsonPath)) {
            const addon = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
            const files = fs.readdirSync(addonDir);
            let changed = false;

            // 1. Rewrite Download Links to GitHub Raw
            // We only link if the file actually exists locally
            const wotlkZip = files.find(f => f === '3.3.5.zip');
            const tbcZip = files.find(f => f === '2.4.3.zip');
            const classicZip = files.find(f => f === '1.12.1.zip');

            if (wotlkZip) {
                addon.downloads.wotlk = `${GITHUB_BASE_URL}/${folder}/3.3.5.zip`;
                addon.downloadUrl = addon.downloads.wotlk; // Default download
                changed = true;
            }
            if (tbcZip) {
                addon.downloads.tbc = `${GITHUB_BASE_URL}/${folder}/2.4.3.zip`;
                changed = true;
            }
            if (classicZip) {
                addon.downloads.classic = `${GITHUB_BASE_URL}/${folder}/1.12.1.zip`;
                changed = true;
            }

            // 2. Rewrite Image Link (Logo)
            // Find any logo file (logo.jpg, logo.png, logo.webp)
            const logoFile = files.find(f => f.startsWith('logo.'));
            if (logoFile) {
                addon.image = `${GITHUB_BASE_URL}/${folder}/${logoFile}`;
                changed = true;
            }

            // 3. Rewrite Screenshot Links
            const localScreenshots = files.filter(f => f.startsWith('screenshot_'));
            if (localScreenshots.length > 0) {
                addon.screenshots = localScreenshots.map(f => `${GITHUB_BASE_URL}/${folder}/${f}`);
                changed = true;
            }

            // 4. Rewrite Detail URL (only if it points to Warperia)
            if (addon.detailUrl && addon.detailUrl.includes('warperia.com')) {
                addon.detailUrl = `${GITHUB_TREE_URL}/${folder}`;
                changed = true;
            }

            // Always write the file to ensure download links are updated
            fs.writeFileSync(jsonPath, JSON.stringify(addon, null, 2));
            count++;
        }
    }

    console.log(`Rewrote links for ${count} addons.`);
    console.log(`\nIMPORTANT: Please create a repository named 'Azeroth-Legacy-Addons-Mirror' and push the '_backup_addons' folder content to it.`);
    console.log(`Once pushed, update the 'GITHUB_BASE_URL' in this script and run it again if your username/repo name differs.`);
}

rewriteJsonLinks();

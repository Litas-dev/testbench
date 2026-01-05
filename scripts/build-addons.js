const fs = require('fs');
const path = require('path');

// Configuration
const DATA_DIR = path.join(__dirname, '../_backup_addons');
const OUTPUT_FILE = path.join(__dirname, '../src/assets/addons.json');
const GITHUB_TREE_URL = 'https://github.com/Litas-dev/Azeroth-Legacy-Addons-Mirror/tree/main';

function build() {
    console.log("Building addons.json from folders...");

    if (!fs.existsSync(DATA_DIR)) {
        console.error("Data directory not found!");
        process.exit(1);
    }

    const addons = [];
    const folders = fs.readdirSync(DATA_DIR);

    for (const folder of folders) {
        const addonFile = path.join(DATA_DIR, folder, 'addon.json');
        if (fs.existsSync(addonFile)) {
            try {
                const data = JSON.parse(fs.readFileSync(addonFile, 'utf8'));
                
                // Convert back to the flat format the app currently expects
                // The app expects: { title, description, image, detailUrl, downloadUrl? }
                // But we want to support multi-expansion now.
                
                // For backward compatibility, we set the 'main' properties
                const entry = {
                    title: data.title,
                    description: data.description,
                    image: data.image,
                    author: data.author,
                    detailUrl: `${GITHUB_TREE_URL}/${folder}`, // Point to GitHub Mirror folder
                    
                    // New: Multi-expansion support
                    // The app needs to be updated to read these 'downloads' object
                    downloads: data.downloads 
                };
                
                // If we have a WotLK download link, expose it as the default 'downloadUrl' for now
                if (data.downloads && data.downloads.wotlk) {
                    entry.downloadUrl = data.downloads.wotlk;
                }

                addons.push(entry);
            } catch (e) {
                console.error(`Error reading ${folder}:`, e.message);
            }
        }
    }

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(addons, null, 2));
    console.log(`Build complete! Wrote ${addons.length} addons to ${OUTPUT_FILE}`);
}

build();

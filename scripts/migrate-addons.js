const fs = require('fs');
const path = require('path');

// Configuration
const SOURCE_FILE = path.join(__dirname, '../src/assets/addons.json');
const DATA_DIR = path.join(__dirname, '../src/assets/addons_data');

// Helpers for string sanitization (folder names)
function sanitizeFolderName(name) {
    return name.replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_').toLowerCase();
}

async function migrate() {
    console.log("Starting migration to folder structure...");

    if (!fs.existsSync(SOURCE_FILE)) {
        console.error("Source addons.json not found!");
        process.exit(1);
    }

    const addons = JSON.parse(fs.readFileSync(SOURCE_FILE, 'utf8'));
    console.log(`Found ${addons.length} addons to process.`);

    for (const addon of addons) {
        const folderName = sanitizeFolderName(addon.title);
        const addonDir = path.join(DATA_DIR, folderName);

        if (!fs.existsSync(addonDir)) {
            fs.mkdirSync(addonDir, { recursive: true });
        }

        // Create addon.json
        const addonData = {
            title: addon.title,
            description: addon.description,
            image: addon.image,
            author: addon.author || 'Unknown',
            // We store the detailUrl as the "Source of Truth" for now
            source: {
                type: 'warperia',
                url: addon.detailUrl
            },
            // Direct download links (populated by robot later)
            downloads: {
                wotlk: addon.downloadUrl || null, // If we already scraped it
                tbc: null,
                classic: null
            }
        };

        // Try to guess expansion based on URL if possible (currently all seem to be wotlk based on file)
        // But the user said "we need for 2.4.3 and vanilla too".
        // In the new structure, a single addon folder can hold links for ALL expansions.
        
        fs.writeFileSync(path.join(addonDir, 'addon.json'), JSON.stringify(addonData, null, 2));
        
        // Create README.md
        const readmeContent = `# ${addon.title}\n\n${addon.description}\n\nAuthor: ${addonData.author}\nSource: ${addonData.source.url}`;
        fs.writeFileSync(path.join(addonDir, 'README.md'), readmeContent);
    }

    console.log(`Migration complete! Created folders in ${DATA_DIR}`);
}

migrate();

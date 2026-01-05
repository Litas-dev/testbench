const fs = require('fs');
const path = require('path');

const ADDONS_FILE = path.join(__dirname, '../src/assets/addons.json');

function checkIntegrity() {
    if (!fs.existsSync(ADDONS_FILE)) {
        console.error('addons.json not found!');
        return;
    }

    const addons = JSON.parse(fs.readFileSync(ADDONS_FILE, 'utf8'));
    let total = addons.length;
    let warperiaLinks = 0;
    let githubLinks = 0;
    let missingLinks = 0;
    
    let missingZips = [];

    addons.forEach(addon => {
        let hasWarperia = false;
        let hasGithub = false;
        
        // Check downloads
        const expansions = ['wotlk', 'tbc', 'classic'];
        expansions.forEach(exp => {
            const url = addon.downloads ? addon.downloads[exp] : null;
            if (url) {
                if (url.includes('warperia.com')) {
                    hasWarperia = true;
                    missingZips.push({
                        title: addon.title,
                        exp: exp,
                        url: url,
                        folder: addon.folderName || addon.title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
                    });
                } else if (url.includes('githubusercontent.com')) {
                    hasGithub = true;
                }
            }
        });

        if (hasWarperia) warperiaLinks++;
        if (hasGithub) githubLinks++;
        if (!addon.downloads || (!addon.downloads.wotlk && !addon.downloads.tbc && !addon.downloads.classic)) {
            missingLinks++;
        }
    });

    console.log('--- Integrity Check ---');
    console.log(`Total Addons: ${total}`);
    console.log(`Addons with GitHub Links: ${githubLinks}`);
    console.log(`Addons with Warperia Links (Missing Zips): ${warperiaLinks}`);
    console.log(`Addons with NO Links: ${missingLinks}`);
    
    if (missingLinks > 0) {
        console.log('\n--- Addons with NO Links ---');
        addons.forEach(addon => {
             if (!addon.downloads || (!addon.downloads.wotlk && !addon.downloads.tbc && !addon.downloads.classic)) {
                console.log(addon.title);
            }
        });
    }
    
    if (missingZips.length > 0) {
        console.log('\n--- Missing Zips Sample (First 5) ---');
        missingZips.slice(0, 5).forEach(item => {
            console.log(`${item.title} [${item.exp}]: ${item.url}`);
        });
        
        // Save list to file for retry script
        fs.writeFileSync(path.join(__dirname, 'missing_zips.json'), JSON.stringify(missingZips, null, 2));
        console.log(`\nSaved ${missingZips.length} missing zip tasks to scripts/missing_zips.json`);
    }
}

checkIntegrity();
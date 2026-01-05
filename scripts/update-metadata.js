const fs = require('fs');
const path = require('path');

const ADDONS_FILE = path.join(__dirname, '../src/assets/addons.json');

async function updateMetadata() {
    console.log('Reading addons.json...');
    const addons = JSON.parse(fs.readFileSync(ADDONS_FILE, 'utf8'));
    
    // Create a lookup map by Title (normalized)
    const addonMap = new Map();
    addons.forEach(addon => {
        addonMap.set(addon.title.toLowerCase().trim(), addon);
    });

    console.log(`Loaded ${addons.length} addons.`);

    let page = 1;
    let hasNextPage = true;
    let updatedCount = 0;

    while (hasNextPage) {
        const url = page === 1 
            ? 'https://warperia.com/wotlk-addons' 
            : `https://warperia.com/wotlk-addons/page/${page}/`;
        
        console.log(`\nFetching Page ${page}: ${url}`);
        
        try {
            const response = await fetch(url);
            if (response.status === 404) {
                console.log('Page not found (404). Stopping.');
                break;
            }
            if (!response.ok) {
                console.log(`Error fetching page: ${response.status}`);
                break;
            }

            const html = await response.text();
            
            // Split by card to process each addon individually
            const cards = html.split('class="card card-addon');
            // Remove the first chunk (header stuff)
            cards.shift();

            if (cards.length === 0) {
                console.log('No addons found on this page. Stopping.');
                hasNextPage = false;
                break;
            }

            console.log(`Found ${cards.length} addons on page ${page}. Processing...`);

            for (const card of cards) {
                // Extract Title
                // Title is usually followed by <span class="text-muted"> by Author</span>
                const titleMatch = card.match(/class="addon-title[^>]*>([\s\S]*?)<span/);
                if (!titleMatch) continue;
                
                const rawTitle = titleMatch[1].trim();
                const cleanTitle = rawTitle.replace(/\s+/g, ' '); // Normalize spaces

                // Find in our DB
                const addon = addonMap.get(cleanTitle.toLowerCase());
                if (addon) {
                    // Extract Metadata
                    const downloadMatch = card.match(/data-tooltip="Downloads"[\s\S]*?<span>([\s\S]*?)<\/span>/);
                    const updatedMatch = card.match(/data-tooltip="Last updated"[\s\S]*?<span>([\s\S]*?)<\/span>/);
                    const uploadedMatch = card.match(/data-tooltip="Upload date"[\s\S]*?<span>([\s\S]*?)<\/span>/);

                    if (downloadMatch) {
                        let dlStr = downloadMatch[1].trim();
                        let dlCount = parseFloat(dlStr);
                        if (dlStr.toUpperCase().includes('K')) dlCount *= 1000;
                        if (dlStr.toUpperCase().includes('M')) dlCount *= 1000000;
                        addon.downloadCount = Math.round(dlCount);
                    }

                    if (updatedMatch) {
                        addon.lastUpdate = updatedMatch[1].trim();
                    }

                    if (uploadedMatch) {
                        addon.uploadDate = uploadedMatch[1].trim();
                    }

                    updatedCount++;
                    process.stdout.write('.');
                } else {
                    // console.log(`Skipping unknown addon: ${cleanTitle}`);
                }
            }
            
            page++;
            // Safety break
            if (page > 100) break;

        } catch (err) {
            console.error('Error:', err);
            break;
        }
    }

    console.log(`\n\nUpdated metadata for ${updatedCount} addons.`);
    
    fs.writeFileSync(ADDONS_FILE, JSON.stringify(addons, null, 2));
    console.log('Saved addons.json');
}

updateMetadata();

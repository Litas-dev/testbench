
const fs = require('fs');
const path = require('path');
// const fetch = require('node-fetch'); // Native in Node 18+

const ADDONS_FILE = path.join(__dirname, '../src/assets/addons.json');
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function parseCount(str) {
    if (!str) return 0;
    str = str.trim().toUpperCase();
    let mult = 1;
    if (str.endsWith('K')) {
        mult = 1000;
        str = str.slice(0, -1);
    } else if (str.endsWith('M')) {
        mult = 1000000;
        str = str.slice(0, -1);
    }
    return Math.floor(parseFloat(str) * mult);
}

function normalizeTitle(title) {
    return title.toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function fetchPage(url) {
    console.log(`Fetching ${url}...`);
    try {
        const response = await fetch(url, {
            headers: { 'User-Agent': USER_AGENT }
        });
        if (!response.ok) {
            console.error(`Failed to fetch ${url}: ${response.status}`);
            return null;
        }
        return await response.text();
    } catch (error) {
        console.error(`Error fetching ${url}: ${error.message}`);
        return null;
    }
}

async function scrapeMetadata() {
    if (!fs.existsSync(ADDONS_FILE)) {
        console.error('addons.json not found!');
        return;
    }

    const addons = JSON.parse(fs.readFileSync(ADDONS_FILE, 'utf8'));
    console.log(`Loaded ${addons.length} addons.`);

    // Create a lookup map for faster access
    const addonMap = new Map();
    addons.forEach(addon => {
        addonMap.set(normalizeTitle(addon.title), addon);
    });

    const expansions = [
        { name: 'wotlk', url: 'https://warperia.com/wotlk-addons' },
        { name: 'tbc', url: 'https://warperia.com/tbc-addons' },
        { name: 'vanilla', url: 'https://warperia.com/vanilla-addons' }
    ];

    for (const exp of expansions) {
        console.log(`\n--- Scraping ${exp.name} ---`);
        let page = 1;
        let consecutiveFailures = 0;

        while (true) {
            const url = page === 1 ? exp.url : `${exp.url}/page/${page}/`;
            const html = await fetchPage(url);
            
            if (!html) {
                consecutiveFailures++;
                if (consecutiveFailures > 2) break; // Stop after 3 failures
                page++;
                continue;
            }

            // Regex to extract addon blocks
            // We use a global regex to find each addon card/item
            // Structure:
            // <div class="addon-title ...">Title <span ...> by Author</span></div>
            // ...
            // data-tooltip="Downloads" ... <span>123K</span>
            // data-tooltip="Last updated" ... <span>Date</span>
            // data-tooltip="Upload date" ... <span>Date</span>
            
            // It's safer to split by "addon-item" or "addon-card" if possible, but let's try a robust regex loop
            // Since HTML is messy, we'll search for the Title first, then look ahead for metadata
            
            const titleRegex = /<div class="addon-title[^>]*>\s*([^<]+?)\s*<span/g;
            let match;
            let foundOnPage = 0;

            while ((match = titleRegex.exec(html)) !== null) {
                const rawTitle = match[1].trim();
                const title = normalizeTitle(rawTitle);
                const addon = addonMap.get(title);

                if (addon) {
                    foundOnPage++;
                    
                    // Look ahead in the next 2000 chars for metadata
                    const snippet = html.substring(match.index, match.index + 2000);
                    
                    // Downloads
                    const downMatch = snippet.match(/data-tooltip="Downloads"[\s\S]*?<i[^>]*>[\s\S]*?<span>([\d\.\w]+)\s*<\/span>/);
                    if (downMatch) {
                        const count = parseCount(downMatch[1]);
                        // Keep the highest count if we see it multiple times (e.g. from different expansions)
                        if (!addon.downloadCount || count > addon.downloadCount) {
                            addon.downloadCount = count;
                        }
                    }

                    // Last Updated
                    const updateMatch = snippet.match(/data-tooltip="Last updated"[\s\S]*?<i[^>]*>[\s\S]*?<span>([^<]+)<\/span>/);
                    if (updateMatch) {
                        addon.lastUpdate = updateMatch[1].trim();
                    }

                    // Upload Date
                    const uploadMatch = snippet.match(/data-tooltip="Upload date"[\s\S]*?<i[^>]*>[\s\S]*?<span>([^<]+)<\/span>/);
                    if (uploadMatch) {
                        addon.uploadDate = uploadMatch[1].trim();
                    }
                    
                    // Assign expansion popularity rank if not exists?
                    // Actually, downloadCount is a good global proxy.
                }
            }

            console.log(`Page ${page}: Updated ${foundOnPage} addons.`);
            
            if (foundOnPage === 0 && page > 1) {
                // If we found nothing on a non-first page, we likely reached the end
                break; 
            }

            page++;
            // Be nice to the server
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    console.log('\n--- Saving Metadata ---');
    fs.writeFileSync(ADDONS_FILE, JSON.stringify(addons, null, 2));
    console.log(`Updated ${ADDONS_FILE}`);
}

scrapeMetadata();

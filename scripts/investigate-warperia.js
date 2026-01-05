
// const fetch = require('node-fetch'); // Native fetch in Node 18+

async function investigate() {
    const urls = [
        'https://warperia.com/wotlk-addons',
        'https://warperia.com/wotlk-addons/page/2/',
    ];

    try {
        for (const url of urls) {
            console.log(`\n--- Fetching ${url} ---`);
            const response = await fetch(url);
            if (!response.ok) {
                console.log(`Failed to fetch ${url}: ${response.status}`);
                continue;
            }
            const html = await response.text();
            
            console.log('--- Page Title ---');
            const titleMatch = html.match(/<title>(.*?)<\/title>/);
            console.log(titleMatch ? titleMatch[1] : 'No title');

            // Just check first addon to verify page content differs
             const addonLinkRegex = /href="(https:\/\/warperia\.com\/addon-[^"]+)"/g;
             const match = addonLinkRegex.exec(html);
             if (match) {
                 console.log(`First addon on page: ${match[1]}`);
             }
        }



    } catch (e) {
        console.error(e);
    }
}

investigate();

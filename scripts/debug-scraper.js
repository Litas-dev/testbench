// const fetch = require('node-fetch'); // Native fetch is available in Node 18+

async function debug() {
    const url = 'https://warperia.com/addon-wotlk/addonlist/';
    console.log(`Fetching ${url}...`);
    const response = await fetch(url);
    const html = await response.text();
    
    console.log('\n--- HTML Snippet containing .zip ---');
    // Extract roughly 200 chars around any .zip link
    const regex = /.{0,200}\.zip.{0,200}/g;
    let match;
    while ((match = regex.exec(html)) !== null) {
        console.log(`\nMATCH:\n${match[0]}\n`);
    }

    // console.log('\n--- Context around "Source" or "GitHub" ---');
    // const externalRegex = /href="([^"]+)"[^>]*>(?:Source|GitHub|Website|Author|Original)/gi;
    
    // Based on the image, there is a "Website: Source Link" in the "Addon Details" sidebar.
    // Let's dump the "Addon Details" section specifically.
    
    console.log('\n--- Images and Screenshots ---');
    // Look for img tags
    const imgRegex = /<img[^>]+src="([^"]+)"[^>]*>/gi;
    let imgMatch;
    while ((imgMatch = imgRegex.exec(html)) !== null) {
        // Filter out small icons or common UI elements if possible, or just dump all
        if (!imgMatch[1].includes('icon-game') && !imgMatch[1].includes('logo.png')) {
             console.log(`Image: ${imgMatch[1]}`);
        }
    }
    
    // Look for specific screenshot galleries if they exist
    // Often wrapped in <a> tags with data-lightbox or similar
    const galleryRegex = /<a[^>]+href="([^"]+\.(?:jpg|jpeg|png|webp))"[^>]+data-lightbox/gi;
    let galMatch;
    while ((galMatch = galleryRegex.exec(html)) !== null) {
        console.log(`Gallery Screenshot: ${galMatch[1]}`);
    }
}

debug();
const fs = require('fs');
const path = require('path');
// const fetch = require('node-fetch'); // Native fetch in Node 18+

// Configuration
// We'll store the "Database" (JSON files) here temporarily, but the BIG files (zips) go to a separate backup folder.
const ADDONS_DATA_DIR = path.join(__dirname, '../src/assets/addons_data'); 
// This is where we will download everything. It should be outside src/ if we don't want it in the build.
// User requested: "folder shold not be in scr"
const DOWNLOAD_DIR = path.join(__dirname, '../_backup_addons'); 

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function fetchWithTimeout(resource, options = {}) {
    const { timeout = 8000 } = options;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(resource, {
            ...options,
            headers: {
                'User-Agent': USER_AGENT,
                ...options.headers
            },
            signal: controller.signal
        });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
}

async function getDownloadLinks(detailUrl) {
    console.log(`Scraping: ${detailUrl}`);
    try {
        const response = await fetchWithTimeout(detailUrl);
        if (!response.ok) throw new Error(`Status ${response.status}`);
        
        const html = await response.text();
        const result = { wotlk: null, tbc: null, classic: null };
        const candidates = []; // Store { url, context }

        // Regex to capture full <a> tag with .zip href
        // Group 1: Attributes before href
        // Group 2: The URL
        // Group 3: Attributes after href
        const anchorRegex = /<a\s+([^>]*?)href="([^"]+\.zip)"([^>]*)>/gi;
        let match;
        
        while ((match = anchorRegex.exec(html)) !== null) {
            const before = match[1] || '';
            const url = match[2];
            const after = match[3] || '';
            const context = (before + ' ' + after).toLowerCase();
            candidates.push({ url, context });
        }

        // Pass 1: Strict Keyword Matching in Context or URL
        for (const cand of candidates) {
            const combined = (cand.url + ' ' + cand.context).toLowerCase();
            
            // WotLK
            if (combined.includes('wotlk') || combined.includes('3.3.5') || combined.includes('addon-wotlk')) {
                if (!result.wotlk) result.wotlk = cand.url;
            }
            // TBC
            else if (combined.includes('tbc') || combined.includes('2.4.3') || combined.includes('addon-tbc')) {
                if (!result.tbc) result.tbc = cand.url;
            }
            // Classic/Vanilla
            else if (combined.includes('vanilla') || combined.includes('classic') || combined.includes('1.12') || combined.includes('addon-vanilla')) {
                if (!result.classic) result.classic = cand.url;
            }
        }

        // Pass 2: Fallback for unassigned generic links
        // If a link wasn't assigned in Pass 1, check if it can fill a gap.
        // This is risky, so we rely on order ONLY if we are fairly sure.
        // But for "Accountant" (WotLK + Vanilla), Pass 1 should have caught it via "addon-vanilla" context.
        
        // Let's gather unassigned links
        const unassigned = candidates.filter(c => 
            c.url !== result.wotlk && c.url !== result.tbc && c.url !== result.classic
        );

        if (unassigned.length > 0) {
            // If we have WotLK but missing others, and we have unassigned links...
            // It's hard to guess without context. 
            // But if we found "addon-vanilla" context, we are good.
            
            // If we still have NO WotLK link, grab the first unassigned one (safest bet for this site)
            if (!result.wotlk) {
                result.wotlk = unassigned[0].url;
            }
        }

        // Pass 3: Capture External Source Link (GitHub/GitLab/Bitbucket)
        // We look for links that are NOT warperia.com and contain "github" or "gitlab" or "source"
        const sourceRegex = /href="([^"]+)"[^>]*>(?:Source|GitHub|GitLab|Project Site|Website)/i;
        const sourceMatch = sourceRegex.exec(html);
        if (sourceMatch) {
            result.sourceUrl = sourceMatch[1];
        } else {
             // Fallback 1: Look for "Website:" in sidebar (based on debug output)
             const websiteRegex = /Website:[\s\S]{0,200}href="([^"]+)"/i;
             const websiteMatch = websiteRegex.exec(html);
             if (websiteMatch) {
                 result.sourceUrl = websiteMatch[1];
             } else {
                 // Fallback 2: Look for any github.com link in the page
                 const githubRegex = /href="([^"]*github\.com[^"]*)"/i;
                 const ghMatch = githubRegex.exec(html);
                 if (ghMatch) {
                     result.sourceUrl = ghMatch[1];
                 }
             }
        }

        // Pass 4: Capture Main Image/Logo
        // We look for the main addon image. Usually it's in the "center-part" or has a specific class.
        // Based on debug logs, it seems to be an <img> tag.
        // Let's try to find the "best" image.
        
        const imgRegex = /<img[^>]+src="([^"]+)"[^>]*>/gi;
        let imgMatch;
        let bestImage = null;
        
        while ((imgMatch = imgRegex.exec(html)) !== null) {
            const src = imgMatch[1];
            // Skip small icons, logos, and common UI elements
            if (src.includes('icon-game') || src.includes('logo.png') || src.includes('icon-shield')) continue;
            
            // Prefer "addon-logo" or "addon-screenshot" or "ww-logo"
            if (src.includes('addon-logo') || src.includes('ww-logo') || src.includes('addon-screenshot')) {
                bestImage = src;
                break; // Found a good candidate
            }
        }
        
        // Pass 5: Capture Screenshot Images (Gallery)
        // Look for the "Images" tab content or screenshot links
        // Based on debug logs, screenshots are often <img> or <a> links with lightbox
        
        const galleryRegex = /<a[^>]+href="([^"]+\.(?:jpg|jpeg|png|webp))"[^>]+data-lightbox/gi;
        let galMatch;
        const screenshots = [];
        
        while ((galMatch = galleryRegex.exec(html)) !== null) {
            screenshots.push(galMatch[1]);
        }
        
        // Also look for img tags that are screenshots (often have 'addon-screenshot' in name or src)
        // If we didn't find any lightbox links, fallback to img scraping
        if (screenshots.length === 0) {
             const imgScreenshotRegex = /<img[^>]+src="([^"]+addon-screenshot[^"]+)"/gi;
             let sMatch;
             while ((sMatch = imgScreenshotRegex.exec(html)) !== null) {
                 screenshots.push(sMatch[1]);
             }
        }

        if (screenshots.length > 0) {
            result.screenshots = [...new Set(screenshots)]; // Remove duplicates
        }

        if (bestImage) {
            result.imageUrl = bestImage;
        }

        return result;
    } catch (error) {
        console.error(`Error scraping ${detailUrl}: ${error.message}`);
        return null;
    }
}

async function downloadFile(url, destPath) {
    if (!url) return false;
    try {
        const response = await fetchWithTimeout(url);
        if (!response.ok) throw new Error(`Status ${response.status}`);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        fs.writeFileSync(destPath, buffer);
        console.log(`Downloaded: ${path.basename(destPath)}`);
        return true;
    } catch (error) {
        console.error(`Failed to download ${url}: ${error.message}`);
        return false;
    }
}

async function updateAddons() {
    if (!fs.existsSync(ADDONS_DATA_DIR)) {
        console.error(`Directory not found: ${ADDONS_DATA_DIR}`);
        process.exit(1);
    }
    
    if (!fs.existsSync(DOWNLOAD_DIR)) {
        fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
    }

    const folders = fs.readdirSync(ADDONS_DATA_DIR);
    let updatedCount = 0;

    for (const folder of folders) {
        const addonFile = path.join(ADDONS_DATA_DIR, folder, 'addon.json');
        if (fs.existsSync(addonFile)) {
            const addon = JSON.parse(fs.readFileSync(addonFile, 'utf8'));
            
            // Only update if it's a Warperia link
            if (addon.source && addon.source.url && addon.source.url.includes('warperia')) {
                const links = await getDownloadLinks(addon.source.url);
                
                if (links) {
                    let changed = false;
                    
                    // Prepare Backup Folder for this Addon
                    const addonBackupDir = path.join(DOWNLOAD_DIR, folder);
                    if (!fs.existsSync(addonBackupDir)) fs.mkdirSync(addonBackupDir, { recursive: true });

                    // Download WotLK (3.3.5)
                    if (links.wotlk) {
                        const dest = path.join(addonBackupDir, '3.3.5.zip');
                        if (!fs.existsSync(dest)) await downloadFile(links.wotlk, dest);
                    }
                    // Download TBC (2.4.3)
                    if (links.tbc) {
                        const dest = path.join(addonBackupDir, '2.4.3.zip');
                        if (!fs.existsSync(dest)) await downloadFile(links.tbc, dest);
                    }
                    // Download Classic (1.12.1)
                    if (links.classic) {
                        const dest = path.join(addonBackupDir, '1.12.1.zip');
                        if (!fs.existsSync(dest)) await downloadFile(links.classic, dest);
                    }
                    // Download Images
                    if (links.imageUrl) {
                         const ext = path.extname(links.imageUrl) || '.jpg';
                         const dest = path.join(addonBackupDir, `logo${ext}`);
                         if (!fs.existsSync(dest)) await downloadFile(links.imageUrl, dest);
                    }
                    // Download Screenshots
                    if (links.screenshots) {
                        let i = 1;
                        for (const shot of links.screenshots) {
                            const ext = path.extname(shot) || '.jpg';
                            const dest = path.join(addonBackupDir, `screenshot_${i}${ext}`);
                            if (!fs.existsSync(dest)) await downloadFile(shot, dest);
                            i++;
                        }
                    }

                    // Update Image if found and different
                    if (links.imageUrl && addon.image !== links.imageUrl) {
                        addon.image = links.imageUrl;
                        changed = true;
                    }
                    
                    // Update Screenshots if found
                    if (links.screenshots && links.screenshots.length > 0) {
                        // Compare arrays roughly
                        const currentScreens = addon.screenshots || [];
                        if (JSON.stringify(currentScreens) !== JSON.stringify(links.screenshots)) {
                            addon.screenshots = links.screenshots;
                            changed = true;
                        }
                    }

                    // Update source URL if found (prefer GitHub/External over Warperia for attribution)
                    if (links.sourceUrl) {
                        // If current source is warperia, overwrite it
                        if (addon.source.type === 'warperia') {
                            addon.source.url = links.sourceUrl;
                            addon.source.type = links.sourceUrl.includes('github') ? 'github' : 'website';
                            changed = true;
                        }
                    }

                    // Update downloads - overwrite with new results (including nulls to clear bad data)
                    addon.downloads = {
                        wotlk: links.wotlk || null,
                        tbc: links.tbc || null,
                        classic: links.classic || null
                    };
                    changed = true;

                    if (changed) {
                        fs.writeFileSync(addonFile, JSON.stringify(addon, null, 2));
                        console.log(`Updated ${addon.title}: WotLK=${!!addon.downloads.wotlk}, TBC=${!!addon.downloads.tbc}, Classic=${!!addon.downloads.classic}`);
                        updatedCount++;
                    } else {
                        console.log(`No changes for ${addon.title}, but ensured downloads.`);
                    }

                    // ALWAYS ensure README.md matches the current source (even if addon.json didn't change this run)
                    const readmeFile = path.join(ADDONS_DATA_DIR, folder, 'README.md');
                    const readmeContent = `# ${addon.title}\n\n${addon.description}\n\nAuthor: ${addon.author}\nSource: ${addon.source.url}\n`;
                    fs.writeFileSync(readmeFile, readmeContent);
                }
                
                // Add a small delay to be polite
                await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
            }
        }
    }

    console.log(`Finished updating ${updatedCount} addons.`);
}

updateAddons();

const fs = require('fs');
const path = require('path');
const https = require('https');

// Configuration
const ADDONS_DIR = path.join(__dirname, '../src/assets/addons_data');
const BACKUP_DIR = path.join(__dirname, '../_backup_addons');
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

async function downloadFile(url, destPath) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(destPath);
        
        // Handle protocols
        const client = url.startsWith('https') ? require('https') : require('http');
        
        const request = client.get(url, {
            headers: { 'User-Agent': USER_AGENT }
        }, (response) => {
            if (response.statusCode === 200) {
                response.pipe(file);
                file.on('finish', () => {
                    file.close(resolve);
                });
            } else if (response.statusCode === 301 || response.statusCode === 302) {
                // Follow redirect
                file.close();
                fs.unlinkSync(destPath);
                downloadFile(response.headers.location, destPath).then(resolve).catch(reject);
            } else {
                file.close();
                fs.unlinkSync(destPath); // Delete failed file
                reject(`Server responded with ${response.statusCode}: ${response.statusMessage}`);
            }
        });

        request.on('error', (err) => {
            file.close();
            fs.unlinkSync(destPath); // Delete failed file
            reject(err.message);
        });
    });
}

async function backupAddons() {
    if (!fs.existsSync(ADDONS_DIR)) {
        console.error(`Directory not found: ${ADDONS_DIR}`);
        process.exit(1);
    }

    const folders = fs.readdirSync(ADDONS_DIR);
    let successCount = 0;
    let failCount = 0;

    console.log(`Starting backup of ${folders.length} addons to ${BACKUP_DIR}...`);

    for (const folder of folders) {
        const addonFile = path.join(ADDONS_DIR, folder, 'addon.json');
        if (fs.existsSync(addonFile)) {
            try {
                const addon = JSON.parse(fs.readFileSync(addonFile, 'utf8'));
                
                // Create folder in backup directory
                const addonBackupDir = path.join(BACKUP_DIR, folder);
                if (!fs.existsSync(addonBackupDir)) {
                    fs.mkdirSync(addonBackupDir, { recursive: true });
                }

                // Download all available links
                if (addon.downloads) {
                    const expansions = ['wotlk', 'tbc', 'classic'];
                    
                    for (const exp of expansions) {
                        const url = addon.downloads[exp];
                        if (url) {
                            const fileName = `${exp}.zip`; // Rename to standardized name
                            const destPath = path.join(addonBackupDir, fileName);
                            
                            // Skip if already downloaded
                            if (fs.existsSync(destPath)) {
                                // console.log(`Skipping ${folder}/${fileName} (already exists)`);
                                continue;
                            }

                            console.log(`Downloading ${folder} [${exp}]...`);
                            try {
                                await downloadFile(url, destPath);
                                successCount++;
                            } catch (err) {
                                console.error(`Failed to download ${folder} [${exp}]: ${err}`);
                                failCount++;
                            }
                            
                            // Be nice to server
                            await new Promise(r => setTimeout(r, 500)); 
                        }
                    }
                }
            } catch (e) {
                console.error(`Error processing ${folder}: ${e.message}`);
            }
        }
    }
    
    console.log(`Backup complete! Downloaded: ${successCount}, Failed: ${failCount}`);
    console.log(`Files are located in: ${BACKUP_DIR}`);
}

backupAddons();

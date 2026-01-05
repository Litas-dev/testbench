import localAddons from '../assets/addons.json';

export const fetchWarperiaAddons = async (ipcRenderer, activeGameId, activeGameVersion) => {
    // Determine the key used in the 'downloads' object for the current expansion
    const expansionKey = activeGameId === 'wotlk' ? 'wotlk' : 
                         activeGameId === 'tbc' ? 'tbc' : 
                         activeGameId === 'vanilla' ? 'classic' : null;

    if (!expansionKey) return [];

    // Filter local addons that have a download link for the current expansion
    // We prioritize the local database which is now the primary source
    const localForExpansion = localAddons
        .filter(a => a.downloads && a.downloads[expansionKey])
        .map(a => ({
            ...a,
            // Override the generic downloadUrl with the expansion-specific one
            downloadUrl: a.downloads[expansionKey],
            // Ensure gameVersion matches the active expansion
            gameVersion: activeGameId === 'wotlk' ? '3.3.5' : 
                         activeGameId === 'tbc' ? '2.4.3' : '1.12.1'
        }));

    return localForExpansion;
    
    /* 
    // Deprecated: Remote fetching is disabled in favor of the local/GitHub mirror
    try {
        const addons = await ipcRenderer.invoke('fetch-warperia-addons', activeGameId);
        if (addons && addons.length > 0) {
            return addons;
        }
    } catch (error) {
        console.error("Error fetching Warperia addons:", error);
    }
    return []; 
    */
};

export const groupAddons = (list) => {
    if (!list || list.length === 0) return [];

    let items = list.map(item => {
        if (typeof item === 'string') return { folderName: item, title: item };
        return item;
    }).sort((a, b) => a.folderName.length - b.folderName.length);

    const groups = {};
    const processed = new Set();

    // Strategy 1: Group by folder naming convention (Parent -> Child)
    items.forEach(item => {
        if (processed.has(item.folderName)) return;

        const children = items.filter(other => 
            other.folderName !== item.folderName && 
            !processed.has(other.folderName) &&
            (other.folderName.startsWith(item.folderName + '_') || other.folderName.startsWith(item.folderName + '-'))
        );

        if (children.length > 0) {
            groups[item.folderName] = { ...item, modules: children };
            processed.add(item.folderName);
            children.forEach(c => processed.add(c.folderName));
        }
    });

    // Strategy 2: Group by common prefix clustering
    const remaining = items.filter(i => !processed.has(i.folderName));
    
    remaining.forEach(item => {
        if (processed.has(item.folderName)) return;

        let prefix = '';
        const separators = ['-', '_'];
        
        for (const sep of separators) {
            const idx = item.folderName.indexOf(sep);
            if (idx >= 3) { // Minimum prefix length of 3 to prevent false positives
                const candidate = item.folderName.substring(0, idx);
                const cluster = remaining.filter(other => 
                     !processed.has(other.folderName) && 
                     (other.folderName.startsWith(candidate + '-') || other.folderName.startsWith(candidate + '_'))
                );
                
                if (cluster.length > 1) {
                     prefix = candidate;
                     break; 
                }
            }
        }

        if (prefix) {
            const cluster = remaining.filter(other => 
                !processed.has(other.folderName) && 
                (other.folderName.startsWith(prefix + '-') || other.folderName.startsWith(prefix + '_'))
            );
            
            // Identify best parent folder name using common convention keywords
            let parent = cluster[0];
            const priorityKeywords = ['core', 'base', 'common', 'main'];
            const bestCandidate = cluster.find(c => priorityKeywords.some(k => c.folderName.toLowerCase().includes(k)));
            if (bestCandidate) parent = bestCandidate;

            const children = cluster.filter(c => c.folderName !== parent.folderName);
            groups[parent.folderName] = { ...parent, modules: children };
            
            cluster.forEach(c => processed.add(c.folderName));
        } else {
            if (!processed.has(item.folderName)) {
               groups[item.folderName] = { ...item, modules: [] };
               processed.add(item.folderName);
            }
        }
    });

    return Object.values(groups);
};

export const processAddonsForDisplay = (groupedAddonsList) => {
    return groupedAddonsList.map(addon => {
        // Normalize addon titles for consistent matching
        const overrides = {
            'DBM-Core': 'Deadly Boss Mods',
            'AtlasLoot': 'AtlasLoot Enhanced',
            'Recount': 'Recount',
            'Questie': 'Questie'
        };
        
        let searchTitle = addon.title;
        if (overrides[addon.title]) searchTitle = overrides[addon.title];

        // Enrich addon data with local metadata if available
        const meta = localAddons.find(a => 
            a.title.toLowerCase() === searchTitle.toLowerCase() || 
            (searchTitle.toLowerCase().includes(a.title.toLowerCase()) && a.title.length > 3) ||
            (a.title.toLowerCase().includes(searchTitle.toLowerCase()) && searchTitle.length > 3)
        );
        
        // Prefer store metadata title over folder name for display
        const displayTitle = meta ? meta.title : addon.title;
        
        return { ...addon, ...meta, title: displayTitle, originalFolderName: addon.folderName };
    });
};

export const filterAddons = (source, addonSearch, addonSort) => {
    let filtered = source.filter(addon => 
        addon.title.toLowerCase().includes(addonSearch.toLowerCase()) || 
        addon.description.toLowerCase().includes(addonSearch.toLowerCase())
    );
    
    /** Sort addons based on user selection */
    if (addonSort === 'a-z') {
        filtered.sort((a, b) => a.title.localeCompare(b.title));
    } else if (addonSort === 'z-a') {
        filtered.sort((a, b) => b.title.localeCompare(a.title));
    } else if (addonSort === 'newest') {
        const getDateVal = (url) => {
            if (!url) return 0;
            const match = url.match(/\/(\d{4})\/(\d{2})\//);
            return match ? parseInt(match[1]) * 100 + parseInt(match[2]) : 0;
        };
        filtered.sort((a, b) => getDateVal(b.image) - getDateVal(a.image));
    }
    // Default sort ('popular') preserves original API order
    
    return filtered;
};

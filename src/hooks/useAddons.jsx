import { useState, useEffect } from 'react';
import ipcRenderer from '../utils/ipc';
import localAddons from '../assets/addons.json';
import { groupAddons, processAddonsForDisplay } from '../utils/addonUtils';
import { games } from '../config/games';

export const useAddons = ({ 
    activeView, 
    activeGameId, 
    gamePaths, 
    selectedDownloadIndex,
    showModal,
    closeModal 
}) => {
    const [addonsList, setAddonsList] = useState([]);
    const [allWarperiaAddons, setAllWarperiaAddons] = useState([]);
    const [browseAddonsList, setBrowseAddonsList] = useState(localAddons.slice(0, 50));
    const [activeAddonTab, setActiveAddonTab] = useState('installed');
    const [installingAddon, setInstallingAddon] = useState(null);
    const [loadingAddons, setLoadingAddons] = useState(false);
    
    // State for filter and sort controls
    const [addonSearch, setAddonSearch] = useState('');
    const [addonSort, setAddonSort] = useState('popular');
    const [addonPage, setAddonPage] = useState(1);
    const [filteredAddonCount, setFilteredAddonCount] = useState(localAddons.length);
    const itemsPerPage = 10;

    const activeGame = games.find(g => g.id === activeGameId);

    useEffect(() => {
        if (activeView === 'addons' && activeAddonTab === 'installed') {
            const path = gamePaths[activeGameId];
            if (!path) {
                setAddonsList([]);
                return;
            }
            const fetchInstalled = async () => {
                try {
                    const raw = await ipcRenderer.invoke('get-addons', path);
                    const grouped = groupAddons(raw || []);
                    const display = processAddonsForDisplay(grouped);
                    setAddonsList(display);
                } catch (e) {
                    setAddonsList([]);
                }
            };
            fetchInstalled();
        }
    }, [activeView, activeAddonTab, activeGameId, gamePaths]);

    // Effect: Fetch available addons from remote source
    useEffect(() => {
        if (activeView === 'addons') {
            const selectedVersion = activeGame.downloads && activeGame.downloads[selectedDownloadIndex] 
                ? activeGame.downloads[selectedDownloadIndex].version 
                : activeGame.version;

            const fetchWarperia = async () => {
                setLoadingAddons(true);
                const wotlkLocal = localAddons.map(a => ({ ...a, gameVersion: '3.3.5' }));
                
                try {
                    // Optimistic update: Show local cache while fetching remote data
                    if (activeGameId === 'wotlk' && allWarperiaAddons.length === 0) {
                        setAllWarperiaAddons(wotlkLocal);
                    }
                    
                    const addons = await ipcRenderer.invoke('fetch-warperia-addons', activeGameId);
                    if (addons && addons.length > 0) {
                        setAllWarperiaAddons(addons);
                    } else if (activeGameId === 'wotlk') {
                        setAllWarperiaAddons(wotlkLocal);
                    } else {
                        setAllWarperiaAddons([]);
                    }
                } catch (error) {
                    console.error("Error fetching Warperia addons:", error);
                    if (activeGameId === 'wotlk') {
                        setAllWarperiaAddons(wotlkLocal);
                    } else {
                        setAllWarperiaAddons([]);
                    }
                } finally {
                    setLoadingAddons(false);
                }
            };
            
            fetchWarperia();
        }
    }, [activeView, activeGameId, selectedDownloadIndex]);

    // Effect: Filter and sort browse list
    useEffect(() => {
        if (activeView === 'addons' && activeAddonTab === 'browse') {
            const wotlkLocal = localAddons.map(a => ({ ...a, gameVersion: '3.3.5' }));
            const source = allWarperiaAddons.length > 0 ? allWarperiaAddons : (activeGameId === 'wotlk' ? wotlkLocal : []);
            
            let filtered = source.filter(addon => 
                addon.title.toLowerCase().includes(addonSearch.toLowerCase()) || 
                addon.description.toLowerCase().includes(addonSearch.toLowerCase())
            );
            
            // Sorting Logic
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
            // 'popular' keeps original order
            
            setFilteredAddonCount(filtered.length);
            
            const start = (addonPage - 1) * itemsPerPage;
            const end = start + itemsPerPage;
            setBrowseAddonsList(filtered.slice(start, end));
        }
    }, [activeView, activeAddonTab, addonSearch, addonSort, addonPage, allWarperiaAddons, activeGameId]);

    const handleInstallWarperiaAddon = async (addon) => {
        if (installingAddon) return;
        
        const path = gamePaths[activeGameId];
        if (!path) {
            showModal('Missing Game Path', "Please locate your World of Warcraft game folder first using the 'Locate Installed Game' button.", <button className="modal-btn-primary" onClick={closeModal}>OK</button>);
            return;
        }

        setInstallingAddon(addon.title);
        
        try {
            const promise = ipcRenderer.invoke('install-warperia-addon', { 
                gamePath: path, 
                detailUrl: addon.detailUrl,
                expansion: activeGameId
            });
            
            const timeout = new Promise((_, reject) => 
                setTimeout(() => reject(new Error("Installation timed out. Please check your internet connection.")), 60000)
            );

            const result = await Promise.race([promise, timeout]);
            
            if (result.success) {
                showModal('Success', `Successfully installed ${addon.title}!`, <button className="modal-btn-primary" onClick={closeModal}>OK</button>);
                // Refresh installed list
                const raw = await ipcRenderer.invoke('get-addons', path);
                const grouped = groupAddons(raw || []);
                const display = processAddonsForDisplay(grouped);
                setAddonsList(display);
            } else {
                showModal('Installation Failed', `Failed to install ${addon.title}: ${result.message}`, <button className="modal-btn-primary" onClick={closeModal}>OK</button>);
            }
        } catch (error) {
            showModal('Error', `Error installing ${addon.title}: ${error.message}`, <button className="modal-btn-primary" onClick={closeModal}>OK</button>);
        } finally {
            setInstallingAddon(null);
        }
    };

    const handleDeleteAddon = async (foldersToDelete) => {
        const path = gamePaths[activeGameId];
        if (!path) return;

        try {
            const result = await ipcRenderer.invoke('delete-addon', {
                gamePath: path,
                addonNames: foldersToDelete
            });

            if (result.success) {
                // Refresh installed list
                const raw = await ipcRenderer.invoke('get-addons', path);
                const grouped = groupAddons(raw || []);
                const display = processAddonsForDisplay(grouped);
                setAddonsList(display);
                showModal('Success', 'Addon uninstalled successfully!', <button className="modal-btn-primary" onClick={closeModal}>OK</button>);
            } else {
                showModal('Error', `Failed to uninstall addon: ${result.message}`, <button className="modal-btn-primary" onClick={closeModal}>OK</button>);
            }
        } catch (error) {
            showModal('Error', `Error uninstalling addon: ${error.message}`, <button className="modal-btn-primary" onClick={closeModal}>OK</button>);
        }
    };

    return {
        addonsList,
        setAddonsList,
        browseAddonsList,
        activeAddonTab,
        setActiveAddonTab,
        installingAddon,
        loadingAddons,
        addonSearch,
        setAddonSearch,
        addonSort,
        setAddonSort,
        addonPage,
        setAddonPage,
        filteredAddonCount,
        handleInstallWarperiaAddon,
        handleDeleteAddon,
        itemsPerPage
    };
};

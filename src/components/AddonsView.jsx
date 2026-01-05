import React, { useState } from 'react';
import { Plus, Puzzle, Search, Trash2, X, Info, Download, Check, Loader2 } from 'lucide-react';
import styles from './AddonsView.module.css';

const AddonsView = ({
    activeGame,
    activeAddonTab,
    setActiveAddonTab,
    groupedAddons = [],
    loadingAddons,
    addonSearch,
    setAddonSearch,
    addonSort,
    setAddonSort,
    browseAddonsList = [],
    installingAddon,
    handleInstallAddon,
    handleInstallWarperiaAddon,
    handleDeleteAddon,
    selectedVersion,
    gameInstalled = false
}) => {
    const [selectedAddon, setSelectedAddon] = useState(null);

    if (!activeGame) return <div className={styles.addonsView}>Error: Game data not found.</div>;

    const openDetails = (addon) => {
        setSelectedAddon(addon);
    };

    const closeDetails = () => {
        setSelectedAddon(null);
    };

    const isAddonInstalled = (browseAddon) => {
        if (!groupedAddons || groupedAddons.length === 0) return false;
        return groupedAddons.some(installed => 
            installed.title.toLowerCase() === browseAddon.title.toLowerCase() ||
            (installed.detailUrl && installed.detailUrl === browseAddon.detailUrl)
        );
    };

    return (
        <div className={styles.addonsView}>
            <div className={styles.viewHeader}>
                <h2>Addons Manager - {activeGame.shortName}</h2>
                {gameInstalled && (
                    <div className={styles.addonTabs}>
                        <button 
                            className={`${styles.tabBtn} ${activeAddonTab === 'installed' ? styles.active : ''}`} 
                            onClick={() => setActiveAddonTab('installed')}
                        >
                            Installed
                        </button>
                        <button 
                            className={`${styles.tabBtn} ${activeAddonTab === 'browse' ? styles.active : ''}`} 
                            onClick={() => setActiveAddonTab('browse')}
                        >
                            Browse
                        </button>
                    </div>
                )}
            </div>

            {!gameInstalled ? (
                <div className={styles.emptyStateContainer}>
                    <div className={styles.infoIconWrapper}>
                        <Info size={48} color="#fb7185" />
                    </div>
                    <div className={styles.emptyStateContent}>
                        <h3 className={styles.emptyStateTitle}>Client Not Found</h3>
                        <p className={styles.emptyStateDesc}>
                            Please install or locate the <span style={{color: 'var(--primary-gold)'}}>{activeGame.name}</span> client to view and manage addons.
                        </p>
                    </div>
                </div>
            ) : activeAddonTab === 'installed' ? (
                <div className={styles.addonsContent}>
                    <div className={styles.addonsToolbar}>
                        <button 
                            className={styles.primaryBtn} 
                            onClick={handleInstallAddon}
                            disabled={!gameInstalled}
                            style={{opacity: !gameInstalled ? 0.5 : 1, cursor: !gameInstalled ? 'not-allowed' : 'pointer'}}
                        >
                            <Plus size={16} /> Install from ZIP
                        </button>
                        <span className={styles.addonCount}>{(groupedAddons || []).length} Addons</span>
                    </div>
                    <div className={styles.addonsListContainer}>
                        {loadingAddons ? (
                            <div className={styles.loadingState}>Loading addons...</div>
                        ) : (groupedAddons || []).length > 0 ? (
                            (groupedAddons || []).map((addon, idx) => (
                                <div key={idx} className={styles.addonRow} onClick={() => openDetails(addon)}>
                                    <div className={styles.addonHeader}>
                                        {addon.image ? (
                                            <img src={addon.image} alt={addon.title} className={styles.addonIcon} />
                                        ) : (
                                            <div className={styles.addonIconPlaceholder}>
                                                <Puzzle size={24} />
                                            </div>
                                        )}
                                        <div className={styles.addonInfo}>
                                            <div className={styles.addonName}>{addon.title}</div>
                                            {addon.author ? (
                                                 <div className={styles.addonAuthor}>by {addon.author}</div>
                                            ) : (
                                                 <div className={styles.addonStatus}>Installed</div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {addon.modules && addon.modules.length > 0 && (
                                        <div className={styles.addonModulesBadge}>
                                            + {addon.modules.length} modules
                                        </div>
                                    )}
                                    
                                    <div className={styles.addonActions}>
                                        <button className={styles.viewBtnSmall} onClick={(e) => {
                                            e.stopPropagation();
                                            openDetails(addon);
                                        }}>
                                            <Info size={14} /> Details
                                        </button>
                                        <button className={styles.deleteBtnSmall} onClick={(e) => {
                                            e.stopPropagation();
                                            const toDelete = [addon.folderName, ...(addon.modules || []).map(m => m.folderName)];
                                            handleDeleteAddon(toDelete);
                                        }}>
                                            Uninstall
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className={styles.emptyState}>No addons found.</div>
                        )}
                    </div>
                </div>
            ) : (
                <div className={styles.addonsContent}>
                     <div className={styles.addonsToolbar}>
                        <div className={styles.searchInputWrapper}>
                            <Search size={16} className={styles.searchIcon} />
                            <input 
                                type="text" 
                                className={styles.searchInput}
                                placeholder="Search addons..." 
                                value={addonSearch}
                                onChange={(e) => setAddonSearch(e.target.value)}
                            />
                        </div>
                        <select 
                            className={styles.sortSelect}
                            value={addonSort}
                            onChange={(e) => setAddonSort(e.target.value)}
                        >
                            <option value="popular">Popularity</option>
                            <option value="newest">Recently Added</option>
                            <option value="updated">Recently Updated</option>
                            <option value="a-z">Name (A-Z)</option>
                            <option value="z-a">Name (Z-A)</option>
                        </select>
                    </div>
                    <div className={styles.addonsListContainer}>
                        {loadingAddons ? (
                            <div className={styles.loadingState}>Loading addons...</div>
                        ) : (browseAddonsList || []).length > 0 ? (
                            (browseAddonsList || []).map((addon, idx) => (
                                <div key={idx} className={styles.addonRow} onClick={() => openDetails(addon)}>
                                    <div className={styles.addonHeader}>
                                        {addon.image ? (
                                            <img src={addon.image} alt={addon.title} className={styles.addonIcon} />
                                        ) : (
                                            <div className={styles.addonIconPlaceholder}>
                                                <Puzzle size={24} />
                                            </div>
                                        )}
                                        <div className={styles.addonInfo}>
                                            <div className={styles.addonName}>
                                                {addon.title}
                                                {addon.gameVersion && (
                                                    <span className={styles.versionBadge}>
                                                        {addon.gameVersion}
                                                    </span>
                                                )}
                                            </div>
                                            <div className={styles.addonAuthor}>by {addon.author}</div>
                                        </div>
                                    </div>
                                    <div className={styles.addonActions}>
                                        <button className={styles.viewBtnSmall} onClick={(e) => {
                                            e.stopPropagation();
                                            openDetails(addon);
                                        }}>
                                            <Info size={14} /> Details
                                        </button>
                                        {isAddonInstalled(addon) ? (
                                            <button 
                                                className={`${styles.installBtnSmall} ${styles.installed}`}
                                                disabled
                                            >
                                                <Check size={14} />
                                                Installed
                                            </button>
                                        ) : (
                                            <button 
                                                className={styles.installBtnSmall}
                                                disabled={!!installingAddon || !gameInstalled}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (gameInstalled) handleInstallWarperiaAddon(addon);
                                                }}
                                            >
                                                {installingAddon === addon.title ? (
                                                    <>
                                                        <Loader2 size={14} className={styles.spinIcon} />
                                                        Installing...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Download size={14} />
                                                        Install
                                                    </>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className={styles.emptyState}>
                                {activeGame.id === 'tbc' && selectedVersion === '2.5.2' && !addonSearch ? 
                                    'No addons available for 2.5.2 at the moment.' : 
                                    (addonSearch ? `No addons found matching "${addonSearch}"` : 'No addons available.')
                                }
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Addon Details Modal */}
            {selectedAddon && (
                <div className={styles.addonModalOverlay} onClick={closeDetails}>
                    <div className={styles.addonModal} onClick={e => e.stopPropagation()}>
                        <div className={styles.addonModalHeader}>
                            <div className={styles.addonModalTitle}>
                                <h3>
                                    {selectedAddon.title}
                                    {selectedAddon.gameVersion && (
                                        <span className={styles.versionBadge} style={{
                                            fontSize: '12px',
                                            padding: '4px 8px',
                                            marginLeft: '10px',
                                            fontWeight: 'normal',
                                            verticalAlign: 'middle'
                                        }}>
                                            {selectedAddon.gameVersion}
                                        </span>
                                    )}
                                </h3>
                                {selectedAddon.author && <span className={styles.addonAuthor}>by {selectedAddon.author}</span>}
                            </div>
                            <button className={styles.addonModalClose} onClick={closeDetails}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className={styles.addonModalContent}>
                            {selectedAddon.image && (
                                <img src={selectedAddon.image} alt={selectedAddon.title} className={styles.addonModalImage} />
                            )}
                            
                            {selectedAddon.description && (
                                <div className={styles.addonModalDesc}>
                                    {selectedAddon.description}
                                </div>
                            )}

                            {selectedAddon.modules && selectedAddon.modules.length > 0 && (
                                <div className={styles.addonModalModules}>
                                    <h4>Included Modules ({selectedAddon.modules.length})</h4>
                                    <div className={styles.modulesList}>
                                        {selectedAddon.modules.map((mod, i) => (
                                            <span key={i} className={styles.moduleTag}>{mod.title || mod.folderName}</span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className={styles.addonModalActions} style={{marginTop: '20px', display: 'flex', justifyContent: 'flex-end'}}>
                                {activeAddonTab === 'installed' ? (
                                    <button className={styles.deleteBtnSmall} style={{padding: '10px 20px'}} onClick={() => {
                                        const toDelete = [selectedAddon.folderName, ...(selectedAddon.modules || []).map(m => m.folderName)];
                                        handleDeleteAddon(toDelete);
                                        closeDetails();
                                    }}>
                                        Uninstall Addon
                                    </button>
                                ) : isAddonInstalled(selectedAddon) ? (
                                    <button 
                                        className={`${styles.installBtnSmall} ${styles.installed}`}
                                        disabled
                                        style={{padding: '8px 16px', fontSize: '13px'}}
                                    >
                                        <Check size={16} />
                                        Already Installed
                                    </button>
                                ) : (
                                    <button 
                                        className={styles.installBtnSmall}
                                        style={{padding: '8px 16px', fontSize: '13px'}}
                                        disabled={!!installingAddon || !gameInstalled}
                                        onClick={() => {
                                            if (gameInstalled) {
                                                handleInstallWarperiaAddon(selectedAddon);
                                                closeDetails();
                                            }
                                        }}
                                    >
                                        {installingAddon === selectedAddon.title ? (
                                            <>
                                                <Loader2 size={16} className={styles.spinIcon} />
                                                Installing...
                                            </>
                                        ) : (
                                            <>
                                                <Download size={16} />
                                                Install Addon
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AddonsView;

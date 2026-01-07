import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import ipcRenderer from '../utils/ipc';
import { games } from '../config/games';
import { playNotificationSound } from '../utils/audio';
import azerothLogo from '../assets/logo-new-white.png';

export const useDownloader = ({ 
    activeGameId, 
    defaultDownloadPath, 
    enableNotifications, 
    enableSoundEffects,
    savePath,
    showModal,
    closeModal 
}) => {
    const { t } = useTranslation();
    const [downloadState, setDownloadState] = useState({
        isDownloading: false,
        gameId: null,
        progress: 0,
        speed: 0,
        downloaded: 0,
        total: 0,
        peers: 0,
        statusMessage: ''
    });

    const [selectedDownloadIndex, setSelectedDownloadIndex] = useState(0);
    const downloadingGameIdRef = useRef(null);

    // Reset selected download when game changes
    useEffect(() => {
        setSelectedDownloadIndex(0);
    }, [activeGameId]);

    // Listen for download events
    useEffect(() => {
        const handleDownloadProgress = (event, data) => {
            setDownloadState(prev => ({
                ...prev,
                isDownloading: true,
                ...data
            }));
        };

        const handleDownloadStatus = (event, message) => {
            setDownloadState(prev => ({
                ...prev,
                statusMessage: message
            }));
        };

        const handleDownloadComplete = (event, { path }) => {
            setDownloadState(prev => ({ ...prev, isDownloading: false, progress: 1, statusMessage: '' }));
            
            // Use the ref to get the correct game ID that started the download
            const targetGameId = downloadingGameIdRef.current || activeGameId;
            if (savePath) savePath(targetGameId, path);
            downloadingGameIdRef.current = null;
            
            if (enableSoundEffects) {
                playNotificationSound();
            }

            if (enableNotifications) {
                if (Notification.permission === "granted") {
                    new Notification(t('downloader.complete_title'), {
                        body: t('downloader.complete_body'),
                        icon: azerothLogo
                    });
                } else if (Notification.permission !== "denied") {
                    Notification.requestPermission().then(permission => {
                        if (permission === "granted") {
                            new Notification(t('downloader.complete_title'), {
                                body: t('downloader.complete_body'),
                                icon: azerothLogo
                            });
                        }
                    });
                }
            }

            if (showModal) {
                showModal(t('downloader.complete_title'), t('downloader.complete_modal_body'), <button className="modal-btn-primary" onClick={closeModal}>{t('modals.ok')}</button>);
            }
        };

        const handleDownloadCancelled = () => {
            downloadingGameIdRef.current = null;
            setDownloadState({
                isDownloading: false,
                progress: 0,
                speed: 0,
                downloaded: 0,
                total: 0,
                peers: 0,
                statusMessage: ''
            });
        };

        ipcRenderer.on('download-progress', handleDownloadProgress);
        ipcRenderer.on('download-status', handleDownloadStatus);
        ipcRenderer.on('download-complete', handleDownloadComplete);
        ipcRenderer.on('download-cancelled', handleDownloadCancelled);

        return () => {
            if (ipcRenderer.removeListener) {
                ipcRenderer.removeListener('download-progress', handleDownloadProgress);
                ipcRenderer.removeListener('download-status', handleDownloadStatus);
                ipcRenderer.removeListener('download-complete', handleDownloadComplete);
                ipcRenderer.removeListener('download-cancelled', handleDownloadCancelled);
            }
        };
    }, [activeGameId, enableNotifications, enableSoundEffects, savePath, showModal, closeModal]);

    const handleDownload = async () => {
        if (showModal) showModal('Download Unavailable', 'Client downloads are no longer supported.', <button className="modal-btn-primary" onClick={closeModal}>OK</button>);
    };

    const handleCancelDownload = () => {
        ipcRenderer.send('cancel-download');
    };

    return {
        downloadState,
        handleDownload,
        handleCancelDownload,
        selectedDownloadIndex,
        setSelectedDownloadIndex
    };
};

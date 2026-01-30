import { useEffect } from 'react';

/**
 * Custom hook to handle sessionStorage-based autoplay
 */
export function useAutoplay(tracks, playTrack, showToast) {
  useEffect(() => {
    const handleAutoplay = async () => {
      const autoplayPath = sessionStorage.getItem('ngks_autoplay');
      if (autoplayPath) {
        sessionStorage.removeItem('ngks_autoplay');
        try {
          const trackIndex = tracks.findIndex(t => t.filePath === autoplayPath);
          if (trackIndex >= 0) {
            console.log('🎵 Autoplay: Found track at index', trackIndex, tracks[trackIndex].title);
            playTrack(tracks[trackIndex], trackIndex);
          } else {
            console.warn('🎵 Autoplay: Track not found in library:', autoplayPath);
            showToast('Track not found in library', 'error');
          }
        } catch (err) {
          console.error('Failed to autoplay track:', err);
          showToast('Failed to play track', 'error');
        }
      }

      const autoplayQueue = sessionStorage.getItem('ngks_autoplay_queue');
      if (autoplayQueue) {
        sessionStorage.removeItem('ngks_autoplay_queue');
        try {
          const queuePaths = JSON.parse(autoplayQueue);
          if (queuePaths.length > 0) {
            const firstTrackInfo = await window.api.invoke('library:getTrackByPath', queuePaths[0]);
            if (firstTrackInfo) {
              playTrack(firstTrackInfo, 0);
            }
          }
        } catch (err) {
          console.error('Failed to autoplay queue:', err);
          showToast('Failed to play queue', 'error');
        }
      }
    };

    if (tracks.length > 0) {
      handleAutoplay();
    }
  }, [tracks, playTrack, showToast]);
}

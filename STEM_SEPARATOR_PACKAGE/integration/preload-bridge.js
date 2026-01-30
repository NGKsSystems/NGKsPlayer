// ==========================================
// Electron Preload IPC Bridge
// Add this code to your electron/preload.js or electron/preload.cjs
// ==========================================

const { contextBridge, ipcRenderer } = require('electron');

// ==========================================
// Expose Electron API to Renderer Process
// ==========================================
contextBridge.exposeInMainWorld('electron', {
  // Generic IPC invoke (for all IPC handlers)
  invoke: (channel, ...args) => {
    // Whitelist allowed channels for security
    const validChannels = [
      'stem-separation:check-python',
      'stem-separation:separate',
      'stem-separation:cancel'
      // Add your other IPC channels here
    ];
    
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    }
    
    throw new Error(`Invalid IPC channel: ${channel}`);
  },
  
  // Event listener for progress updates
  on: (channel, callback) => {
    const validChannels = [
      'stem-separation:progress'
      // Add your other event channels here
    ];
    
    if (validChannels.includes(channel)) {
      // Wrap callback to match expected signature
      ipcRenderer.on(channel, (event, ...args) => callback(event, ...args));
    } else {
      throw new Error(`Invalid event channel: ${channel}`);
    }
  },
  
  // Optional: Remove event listener
  removeListener: (channel, callback) => {
    ipcRenderer.removeListener(channel, callback);
  }
});

// ==========================================
// SECURITY NOTES:
// ==========================================
// 1. Always whitelist channels - never expose ipcRenderer directly
// 2. Validate channel names before allowing IPC calls
// 3. This prevents malicious scripts from accessing Electron APIs
// 4. Add your app's other IPC channels to the validChannels arrays

// ==========================================
// USAGE IN REACT:
// ==========================================
// window.electron.invoke('stem-separation:check-python')
// window.electron.invoke('stem-separation:separate', { filePath, stemsCount })
// window.electron.on('stem-separation:progress', (event, update) => { ... })

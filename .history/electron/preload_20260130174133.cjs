// electron/preload.cjs  (CommonJS)
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // ----- dialogs / scanning -----
  openFolder: () => ipcRenderer.invoke('dialog:openFolder'),
  selectFile: () => ipcRenderer.invoke('dialog:selectFile'),
  selectDirectory: () => ipcRenderer.invoke('dialog:selectDirectory'),
  getDirectoryFiles: (dirPath) => ipcRenderer.invoke('dialog:getDirectoryFiles', dirPath),
  scanLibrary: (folder) => ipcRenderer.invoke('library:scan', folder),
  autoScan: () => ipcRenderer.invoke('library:autoScan'),

  // ----- library lists -----
  listArtists: () => ipcRenderer.invoke('library:listArtists'),
  listAlbums: () => ipcRenderer.invoke('library:listAlbums'),
  listSongs: () => ipcRenderer.invoke('library:listSongs'),
  listFolders: () => ipcRenderer.invoke('library:listFolders'),
  listGenres: () => ipcRenderer.invoke('library:listGenres'),

  // ----- library queries (filter & by path) -----
  getTracks: (filter) => ipcRenderer.invoke('library:getTracks', filter || {}),
  getTrackByPath: (absPath) => ipcRenderer.invoke('library:getTrackByPath', { absPath }),
  getTrackById: (trackId) => ipcRenderer.invoke('library:getTrackById', trackId),

  // ----- playlists -----
  listPlaylists: () => ipcRenderer.invoke('listPlaylists'),
  createPlaylist: (name) => ipcRenderer.invoke('createPlaylist', name),
  renamePlaylist: (id, newName) => ipcRenderer.invoke('renamePlaylist', id, newName),
  deletePlaylist: (id) => ipcRenderer.invoke('deletePlaylist', id),
  getPlaylistTracks: (playlistId) => ipcRenderer.invoke('getPlaylistTracks', playlistId),
  addTrackToPlaylist: (playlistId, trackId) => ipcRenderer.invoke('addTrackToPlaylist', playlistId, trackId),
  removeTrackFromPlaylist: (playlistTrackId) => ipcRenderer.invoke('removeTrackFromPlaylist', playlistTrackId),
  reorderPlaylistTracks: (playlistId, trackIds) => ipcRenderer.invoke('reorderPlaylistTracks', playlistId, trackIds),

  // ----- file operations -----
  renameTrack: (oldPath, newName) => ipcRenderer.invoke('library:renameFile', { oldPath, newName }),
  removeFromLibrary: (trackId) => ipcRenderer.invoke('library:removeTrack', trackId),
  deleteTrack: (filePath) => ipcRenderer.invoke('library:deleteFile', filePath),

  // ----- play pipe -----
  playFile: (absPath) => ipcRenderer.invoke('player:playFile', absPath),
  onPlayFile: (handler) => {
    const wrapped = (_e, p) => handler && handler(p);
    ipcRenderer.on('player:playFile', wrapped);
    return () => ipcRenderer.removeListener('player:playFile', wrapped);
  },

  // ----- deck loading -----
  loadToDeck: (deck, trackPath) => ipcRenderer.invoke('deck:loadTrack', { deck, trackPath }),
  onDeckLoad: (handler) => {
    const wrapped = (_e, data) => handler && handler(data);
    ipcRenderer.on('deck:loadTrack', wrapped);
    return () => ipcRenderer.removeListener('deck:loadTrack', wrapped);
  },

  // ----- library to player -----
  sendToPlayer: (data) => ipcRenderer.send('library:sendToPlayer', data),
  onLibraryLoad: (handler) => {
    const wrapped = (_e, data) => handler && handler(data);
    ipcRenderer.on('library:loadToPlayer', wrapped);
    return () => ipcRenderer.removeListener('library:loadToPlayer', wrapped);
  },

  // ----- generic invoke (for new features) -----
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),

  // ----- initialization signals -----
  onAppDatabaseReady: (handler) => {
    const wrapped = (_e) => handler && handler();
    ipcRenderer.on('app-database-ready', wrapped);
    return () => ipcRenderer.removeListener('app-database-ready', wrapped);
  },

  onAppReady: (handler) => {
    const wrapped = (_e) => handler && handler();
    ipcRenderer.on('app-ready', wrapped);
    return () => ipcRenderer.removeListener('app-ready', wrapped);
  },

  // ----- file system -----
  createBlobUrl: (absPath) => ipcRenderer.invoke('fs:createBlobUrl', absPath),

  // ----- normalization -----
  normalizePreview: (folderPath, options) => ipcRenderer.invoke('normalize:preview', { folderPath, options }),
  normalizeExecute: (folderPath, options) => ipcRenderer.invoke('normalize:execute', { folderPath, options }),
  getNormalizeSettings: () => ipcRenderer.invoke('normalize:getSettings'),
  saveNormalizeSettings: (settings) => ipcRenderer.invoke('normalize:saveSettings', settings),
  
  // ----- spelling correction -----
  fixSpelling: (payload) => ipcRenderer.invoke('normalize:correctSpelling', payload),
  
  // ----- track updates -----
  updateTrack: (trackId, updates) => ipcRenderer.invoke('library:updateTrack', { trackId, updates }),
  markTrackError: (trackId, hasError) => ipcRenderer.invoke('library:markTrackError', { trackId, hasError }),
  
  // ----- audio analysis (UNIFIED) -----
  updateAnalysis: (trackId, bpm, key) => ipcRenderer.invoke('library:updateAnalysis', { trackId, bpm, key }),
  getUnanalyzedTracks: () => ipcRenderer.invoke('library:getUnanalyzedTracks'),
  analyzeTrack: (filePath, trackId) => ipcRenderer.invoke('library:analyzeTrack', { filePath, trackId }),
  
  // ----- layout persistence -----
  saveLayout: (layoutData) => ipcRenderer.invoke('layout:save', layoutData),
  loadLayout: () => ipcRenderer.invoke('layout:load'),
  
  // ----- tag editing -----
  getTags: (filePath) => ipcRenderer.invoke('getTags', filePath),
  writeTags: (payload) => ipcRenderer.invoke('writeTags', payload),
  analyzeTags: (filePath) => ipcRenderer.invoke('analyzeTags', filePath),
  
  // ----- music layer remover -----
  processLayerRemoval: (options) => ipcRenderer.invoke('processLayerRemoval', options),
  openFolderInExplorer: (folderPath) => ipcRenderer.invoke('openFolder', folderPath),
  selectFolder: () => ipcRenderer.invoke('selectFolder'),
  
  // ----- library management -----
  clearAndRebuild: (foldersToScan) => ipcRenderer.invoke('db:clearAndRebuild', foldersToScan),
  getTrackCount: () => ipcRenderer.invoke('db:getTrackCount'),
});

// Broadcast/OBS Integration API
contextBridge.exposeInMainWorld('electron', {
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  on: (channel, callback) => {
    ipcRenderer.on(channel, callback);
    return () => ipcRenderer.removeListener(channel, callback);
  },
  off: (channel, callback) => {
    ipcRenderer.removeListener(channel, callback);
  }
});

// Professional Audio Engine Communication
contextBridge.exposeInMainWorld('electronAPI', {
  send: (channel, data) => {
    ipcRenderer.send(channel, data);
  },
  receive: (channel, func) => {
    ipcRenderer.on(channel, (event, ...args) => func(...args));
  },
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});

// Fast/Deep Analysis API with Worker Threads
contextBridge.exposeInMainWorld('analyzerAPI', {
  analyzeFile: (filePath, trackId) => ipcRenderer.invoke('analyzer:analyzeFile', { filePath, trackId }),
  cancelAnalysis: (trackId) => ipcRenderer.invoke('analyzer:cancel', { trackId }),
  cancelAll: () => ipcRenderer.invoke('analyzer:cancelAll'),
  onAnalysisUpdate: (callback) => {
    ipcRenderer.on('analysis-update', (event, data) => callback(data));
    return () => ipcRenderer.removeListener('analysis-update', callback);
  },
});


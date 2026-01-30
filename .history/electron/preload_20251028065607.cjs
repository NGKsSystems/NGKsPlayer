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

  // ----- playlists -----
  listPlaylists: () => ipcRenderer.invoke('listPlaylists'),
  createPlaylist: (name) => ipcRenderer.invoke('createPlaylist', name),
  renamePlaylist: (id, newName) => ipcRenderer.invoke('renamePlaylist', id, newName),
  deletePlaylist: (id) => ipcRenderer.invoke('deletePlaylist', id),
  getPlaylistTracks: (playlistId) => ipcRenderer.invoke('getPlaylistTracks', playlistId),
  addTrackToPlaylist: (playlistId, trackId) => ipcRenderer.invoke('addTrackToPlaylist', playlistId, trackId),
  removeTrackFromPlaylist: (playlistTrackId) => ipcRenderer.invoke('removeTrackFromPlaylist', playlistTrackId),
  reorderPlaylistTracks: (playlistId, trackIds) => ipcRenderer.invoke('reorderPlaylistTracks', playlistId, trackIds),

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

  // ----- generic invoke (for new features) -----
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),

  // ----- normalization -----
  normalizePreview: (folderPath, options) => ipcRenderer.invoke('normalize:preview', { folderPath, options }),
  normalizeExecute: (folderPath, options) => ipcRenderer.invoke('normalize:execute', { folderPath, options }),
  getNormalizeSettings: () => ipcRenderer.invoke('normalize:getSettings'),
  saveNormalizeSettings: (settings) => ipcRenderer.invoke('normalize:saveSettings', settings),
  
  // ----- spelling correction -----
  fixSpelling: (payload) => ipcRenderer.invoke('normalize:correctSpelling', payload),
  
  // ----- track updates -----
  updateTrack: (trackId, updates) => ipcRenderer.invoke('library:updateTrack', { trackId, updates }),
  
  // ----- audio analysis -----
  updateAnalysis: (trackId, bpm, key) => ipcRenderer.invoke('library:updateAnalysis', { trackId, bpm, key }),
  getUnanalyzedTracks: () => ipcRenderer.invoke('library:getUnanalyzedTracks'),
  
  // ----- layout persistence -----
  saveLayout: (layoutData) => ipcRenderer.invoke('layout:save', layoutData),
  loadLayout: () => ipcRenderer.invoke('layout:load'),
  
  // ----- tag editing -----
  getTags: (filePath) => ipcRenderer.invoke('getTags', filePath),
  writeTags: (payload) => ipcRenderer.invoke('writeTags', payload),
  analyzeTags: (filePath) => ipcRenderer.invoke('analyzeTags', filePath),
  
  // ----- music layer remover -----
  processLayerRemoval: (options) => ipcRenderer.invoke('processLayerRemoval', options),
  openFolder: (folderPath) => ipcRenderer.invoke('openFolder', folderPath),
  selectFolder: () => ipcRenderer.invoke('selectFolder'),
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


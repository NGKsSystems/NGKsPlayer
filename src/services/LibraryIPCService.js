/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: LibraryIPCService.js
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
/**
 * Library IPC Service
 * 
 * Handles all IPC calls for library data with proper error handling
 * Problem Fixed: IPC calls were failing silently without error feedback
 * 
 * @module services/LibraryIPCService
 */

/**
 * Safely call IPC method with error handling
 * @param {string} method - IPC method name
 * @param {*} args - Arguments to pass to IPC
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<*>} Result from IPC call
 */
async function safeIPCCall(method, args = null, timeout = 5000) {
  return new Promise((resolve, reject) => {
    try {
      // Check if IPC bridge exists
      if (!window.api || typeof window.api[method] !== 'function') {
        throw new Error(`IPC method not available: ${method}`);
      }

      // Set up timeout
      const timeoutId = setTimeout(() => {
        reject(new Error(`IPC call to ${method} timed out after ${timeout}ms`));
      }, timeout);

      // Make IPC call
      const promise = args ? window.api[method](args) : window.api[method]();

      promise
        .then((result) => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Load library data with proper error handling
 * @param {string} dataType - Type of data: 'songs', 'artists', 'albums', 'folders', 'genres'
 * @param {*} filter - Optional filter for getTracks
 * @returns {Promise<Array>} Array of items
 */
export async function loadLibraryData(dataType, filter = null) {
  try {
    let result;

    switch (dataType) {
      case 'songs':
        result = await safeIPCCall('listSongs', null, 5000);
        break;
      case 'artists':
        result = await safeIPCCall('listArtists', null, 5000);
        break;
      case 'albums':
        result = await safeIPCCall('listAlbums', null, 5000);
        break;
      case 'folders':
        result = await safeIPCCall('listFolders', null, 5000);
        break;
      case 'genres':
        result = await safeIPCCall('listGenres', null, 5000);
        break;
      case 'playlists':
        result = await safeIPCCall('listPlaylists', null, 5000);
        break;
      case 'tracks':
        result = await safeIPCCall('getTracks', filter || {}, 5000);
        break;
      default:
        throw new Error(`Unknown data type: ${dataType}`);
    }

    if (!result) {
      throw new Error(`No data returned for ${dataType}`);
    }

    return Array.isArray(result) ? result : [];
  } catch (error) {
    console.error(`[LibraryIPC] Error loading ${dataType}:`, error.message);
    throw error;
  }
}

/**
 * Load multiple data types in parallel
 * @param {string[]} dataTypes - Array of data types to load
 * @returns {Promise<Object>} Object with results for each data type
 */
export async function loadMultipleLibraryData(dataTypes) {
  const results = {};

  const promises = dataTypes.map(async (type) => {
    try {
      results[type] = await loadLibraryData(type);
    } catch (error) {
      console.error(`[LibraryIPC] Failed to load ${type}:`, error.message);
      results[type] = [];
    }
  });

  await Promise.allSettled(promises);

  return results;
}

export default {
  loadLibraryData,
  loadMultipleLibraryData,
  safeIPCCall,
};


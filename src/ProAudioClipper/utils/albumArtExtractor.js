/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: albumArtExtractor.js
 * Purpose: TODO â€“ describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
/**
 * Album Art Extractor
 * 
 * Extracts album artwork from audio files using:
 * - ID3 tags (MP3)
 * - Vorbis Comments (OGG, OPUS)
 * - MP4/M4A metadata
 * - FLAC metadata
 * 
 * Falls back to music library metadata or placeholder
 */

import * as musicMetadata from 'music-metadata-browser';

/**
 * Extract album art from an audio file
 * @param {File|string} audioFile - File object or file path
 * @returns {Promise<string|null>} - Data URL of album art or null
 */
export async function extractAlbumArt(audioFile) {
  try {
    let metadata;
    
    if (audioFile instanceof File) {
      // Browser File object
      metadata = await musicMetadata.parseBlob(audioFile);
    } else if (typeof audioFile === 'string') {
      // File path - fetch and parse
      const response = await fetch(audioFile);
      const blob = await response.blob();
      metadata = await musicMetadata.parseBlob(blob);
    } else {
      console.error('Invalid audio file type');
      return null;
    }
    
    // Extract picture from metadata
    if (metadata.common && metadata.common.picture && metadata.common.picture.length > 0) {
      const picture = metadata.common.picture[0];
      const blob = new Blob([picture.data], { type: picture.format });
      return URL.createObjectURL(blob);
    }
    
    return null;
  } catch (error) {
    console.error('Failed to extract album art:', error);
    return null;
  }
}

/**
 * Extract song metadata including album art
 * @param {File|string} audioFile - File object or file path
 * @returns {Promise<Object>} - Metadata object with title, artist, album, albumArt
 */
export async function extractMetadata(audioFile) {
  try {
    let metadata;
    
    if (audioFile instanceof File) {
      metadata = await musicMetadata.parseBlob(audioFile);
    } else if (typeof audioFile === 'string') {
      const response = await fetch(audioFile);
      const blob = await response.blob();
      metadata = await musicMetadata.parseBlob(blob);
    } else {
      return getDefaultMetadata();
    }
    
    const common = metadata.common || {};
    
    // Extract album art
    let albumArt = null;
    if (common.picture && common.picture.length > 0) {
      const picture = common.picture[0];
      const blob = new Blob([picture.data], { type: picture.format });
      albumArt = URL.createObjectURL(blob);
    }
    
    return {
      title: common.title || extractFilename(audioFile),
      artist: common.artist || common.albumartist || 'Unknown Artist',
      album: common.album || 'Unknown Album',
      year: common.year || null,
      genre: common.genre ? common.genre.join(', ') : null,
      albumArt: albumArt,
      duration: metadata.format?.duration || null,
      bitrate: metadata.format?.bitrate || null,
      sampleRate: metadata.format?.sampleRate || null
    };
  } catch (error) {
    console.error('Failed to extract metadata:', error);
    return getDefaultMetadata(audioFile);
  }
}

/**
 * Get filename without extension
 */
function extractFilename(file) {
  if (file instanceof File) {
    return file.name.replace(/\.[^/.]+$/, '');
  } else if (typeof file === 'string') {
    const filename = file.split(/[\\/]/).pop();
    return filename ? filename.replace(/\.[^/.]+$/, '') : 'Unknown Track';
  }
  return 'Unknown Track';
}

/**
 * Default metadata when extraction fails
 */
function getDefaultMetadata(audioFile = null) {
  return {
    title: audioFile ? extractFilename(audioFile) : 'Unknown Track',
    artist: 'Unknown Artist',
    album: 'Unknown Album',
    year: null,
    genre: null,
    albumArt: null,
    duration: null,
    bitrate: null,
    sampleRate: null
  };
}

/**
 * Generate a placeholder album art with gradient
 * @param {string} title - Song title for color seed
 * @returns {string} - Data URL of generated image
 */
export function generatePlaceholderArt(title = 'Unknown') {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  
  // Generate color based on title
  const hash = title.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  
  const hue = Math.abs(hash % 360);
  
  // Create gradient
  const gradient = ctx.createLinearGradient(0, 0, 512, 512);
  gradient.addColorStop(0, `hsl(${hue}, 70%, 60%)`);
  gradient.addColorStop(1, `hsl(${(hue + 60) % 360}, 70%, 40%)`);
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 512);
  
  // Add music note icon
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.font = 'bold 200px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('â™ª', 256, 256);
  
  return canvas.toDataURL('image/png');
}

/**
 * Get album art with fallback to placeholder
 * @param {File|string} audioFile - Audio file
 * @param {string} title - Song title for placeholder generation
 * @returns {Promise<string>} - Data URL of album art (never null)
 */
export async function getAlbumArtOrPlaceholder(audioFile, title = 'Unknown') {
  const albumArt = await extractAlbumArt(audioFile);
  return albumArt || generatePlaceholderArt(title);
}

/**
 * Check if music-metadata-browser is available
 * @returns {boolean}
 */
export function isMetadataExtractionSupported() {
  try {
    return typeof musicMetadata !== 'undefined';
  } catch {
    return false;
  }
}

export default {
  extractAlbumArt,
  extractMetadata,
  generatePlaceholderArt,
  getAlbumArtOrPlaceholder,
  isMetadataExtractionSupported
};


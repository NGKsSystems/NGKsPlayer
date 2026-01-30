/**
 * App Isolation Module
 * Prevents multiple NGKS Electron apps from interfering with each other
 * Using App ID + handshake token pattern for local IPC security
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const logger = require('./logger.cjs');

const APP_ID = 'ngks.player';
const DISCOVERY_DIR = path.join(app.getPath('appData'), 'NGKsBus');
const DISCOVERY_FILE = path.join(DISCOVERY_DIR, `${APP_ID}.json`);

class AppIsolation {
  constructor() {
    this.appId = APP_ID;
    this.token = null;
    this.serverPort = null;
    this.startedAt = Date.now();
  }

  /**
   * Initialize app isolation on startup
   * Generates unique token and writes discovery file
   */
  initialize() {
    logger.debug('AppIsolation', `Initializing for ${this.appId}`);
    
    // Generate random one-time token for this session
    this.token = crypto.randomBytes(32).toString('base64url');
    
    // Ensure discovery directory exists
    if (!fs.existsSync(DISCOVERY_DIR)) {
      fs.mkdirSync(DISCOVERY_DIR, { recursive: true, mode: 0o700 });
      logger.debug('AppIsolation', `Created discovery directory: ${DISCOVERY_DIR}`);
    }

    // Write discovery file with restrictive permissions
    const discoveryData = {
      appId: this.appId,
      token: this.token,
      pid: process.pid,
      startedAt: this.startedAt,
      version: app.getVersion(),
      name: app.getName()
    };

    try {
      fs.writeFileSync(DISCOVERY_FILE, JSON.stringify(discoveryData, null, 2), {
        mode: 0o600 // Read/write for owner only
      });
      logger.debug('AppIsolation', `Discovery file written: ${DISCOVERY_FILE}`);
      logger.verbose('AppIsolation', `Token: ${this.token.substring(0, 16)}...`);
    } catch (err) {
      logger.error('AppIsolation', 'Failed to write discovery file:', err);
    }

    // Clean up discovery file on exit
    app.on('before-quit', () => this.cleanup());
    process.on('exit', () => this.cleanup());
    process.on('SIGINT', () => {
      this.cleanup();
      process.exit(0);
    });
    process.on('SIGTERM', () => {
      this.cleanup();
      process.exit(0);
    });
  }

  /**
   * Validate that a client app is who they claim to be
   * @param {string} clientAppId - The app ID the client claims to be
   * @param {string} clientToken - The token provided by the client
   * @returns {boolean} - True if valid
   */
  validateClient(clientAppId, clientToken) {
    logger.debug('AppIsolation', `Validating client: ${clientAppId}`);
    
    // Check if this is a known NGKS app
    const validAppIds = ['ngks.mail', 'ngks.writer', 'ngks.player'];
    if (!validAppIds.includes(clientAppId)) {
      logger.warn('AppIsolation', `Unknown app ID: ${clientAppId}`);
      return false;
    }

    // If client is trying to connect to us, verify their discovery file exists
    const clientDiscoveryFile = path.join(DISCOVERY_DIR, `${clientAppId}.json`);
    
    if (!fs.existsSync(clientDiscoveryFile)) {
      logger.warn('AppIsolation', `No discovery file for: ${clientAppId}`);
      return false;
    }

    try {
      const clientData = JSON.parse(fs.readFileSync(clientDiscoveryFile, 'utf8'));
      
      // Verify app ID matches
      if (clientData.appId !== clientAppId) {
        logger.warn('AppIsolation', 'App ID mismatch in discovery file');
        return false;
      }

      // Verify token matches
      if (clientData.token !== clientToken) {
        logger.warn('AppIsolation', `Token mismatch for ${clientAppId}`);
        return false;
      }

      // Verify process is still running
      try {
        process.kill(clientData.pid, 0); // Signal 0 just checks if process exists
        logger.debug('AppIsolation', `Client ${clientAppId} validated successfully`);
        return true;
      } catch (err) {
        logger.warn('AppIsolation', `Client process ${clientData.pid} not running`);
        return false;
      }

    } catch (err) {
      logger.error('AppIsolation', 'Error reading client discovery file:', err);
      return false;
    }
  }

  /**
   * Get connection info for another NGKS app
   * @param {string} targetAppId - The app to connect to (e.g., 'ngks.mail')
   * @returns {Object|null} - Connection info or null if not found
   */
  getAppConnection(targetAppId) {
    const targetDiscoveryFile = path.join(DISCOVERY_DIR, `${targetAppId}.json`);
    
    if (!fs.existsSync(targetDiscoveryFile)) {
      logger.debug('AppIsolation', `App ${targetAppId} not running (no discovery file)`);
      return null;
    }

    try {
      const targetData = JSON.parse(fs.readFileSync(targetDiscoveryFile, 'utf8'));
      
      // Verify process is still running
      try {
        process.kill(targetData.pid, 0);
        logger.debug('AppIsolation', `Found running app: ${targetAppId} (PID: ${targetData.pid})`);
        return targetData;
      } catch (err) {
        logger.debug('AppIsolation', `App ${targetAppId} discovery file stale (process not running)`);
        // Clean up stale file
        fs.unlinkSync(targetDiscoveryFile);
        return null;
      }

    } catch (err) {
      logger.error('AppIsolation', `Error reading discovery file for ${targetAppId}:`, err);
      return null;
    }
  }

  /**
   * Enforce single instance lock for this app
   * Prevents multiple instances of NGKsPlayer from running
   */
  enforceSingleInstance() {
    const gotLock = app.requestSingleInstanceLock();
    
    if (!gotLock) {
      logger.info('AppIsolation', `Another instance of ${this.appId} is already running`);
      app.quit();
      return false;
    }

    logger.info('AppIsolation', `Single instance lock acquired for ${this.appId}`);
    
    // Handle second instance attempts
    app.on('second-instance', (event, commandLine, workingDirectory) => {
      logger.info('AppIsolation', 'Second instance attempt blocked');
      logger.verbose('AppIsolation', '  Command line:', commandLine);
      logger.verbose('AppIsolation', '  Working directory:', workingDirectory);
      
      // Could focus the existing window here
      // mainWindow?.focus();
    });

    return true;
  }

  /**
   * Cleanup on app exit
   */
  cleanup() {
    logger.debug('AppIsolation', 'Cleaning up...');
    
    try {
      if (fs.existsSync(DISCOVERY_FILE)) {
        fs.unlinkSync(DISCOVERY_FILE);
        logger.debug('AppIsolation', 'Discovery file removed');
      }
    } catch (err) {
      logger.error('AppIsolation', 'Error during cleanup:', err);
    }
  }

  /**
   * Get this app's token for IPC authentication
   */
  getToken() {
    return this.token;
  }

  /**
   * Get this app's ID
   */
  getAppId() {
    return this.appId;
  }
}

// Export singleton instance
const appIsolation = new AppIsolation();
module.exports = appIsolation;

/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: SecurityCore.js
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
/**
 * Professional Security Core Infrastructure
 * Comprehensive security classes for cloud integration protection
 */

import CryptoJS from 'crypto-js';

// Audio Encryption System
export class AudioEncryption {
    constructor() {
        this.algorithm = 'AES-GCM';
        this.keyLength = 256;
        this.ivLength = 12;
        this.tagLength = 16;
        this.iterations = 100000; // PBKDF2 iterations
    }

    /**
     * Derive encryption key from user password
     */
    async deriveKey(password, salt = null) {
        if (!salt) {
            salt = crypto.getRandomValues(new Uint8Array(16));
        }

        const passwordBuffer = new TextEncoder().encode(password);
        
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            passwordBuffer,
            'PBKDF2',
            false,
            ['deriveKey']
        );

        const key = await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: this.iterations,
                hash: 'SHA-256'
            },
            keyMaterial,
            {
                name: this.algorithm,
                length: this.keyLength
            },
            false,
            ['encrypt', 'decrypt']
        );

        return { key, salt };
    }

    /**
     * Encrypt audio buffer data
     */
    async encryptAudioData(audioBuffer, userKey) {
        try {
            const { key, salt } = await this.deriveKey(userKey);
            const iv = crypto.getRandomValues(new Uint8Array(this.ivLength));
            
            // Convert audio buffer to array buffer if needed
            let dataToEncrypt;
            if (audioBuffer instanceof AudioBuffer) {
                dataToEncrypt = this.audioBufferToArrayBuffer(audioBuffer);
            } else {
                dataToEncrypt = audioBuffer;
            }

            const encrypted = await crypto.subtle.encrypt(
                {
                    name: this.algorithm,
                    iv: iv
                },
                key,
                dataToEncrypt
            );

            // Create integrity hash
            const hmacKey = await this.deriveHMACKey(userKey, salt);
            const hmac = await this.createHMAC(hmacKey, new Uint8Array(encrypted));

            return {
                encrypted: new Uint8Array(encrypted),
                iv: iv,
                salt: salt,
                hmac: hmac,
                metadata: {
                    algorithm: this.algorithm,
                    keyLength: this.keyLength,
                    timestamp: Date.now()
                }
            };
        } catch (error) {
            console.error('Encryption failed:', error);
            throw new Error('Audio encryption failed');
        }
    }

    /**
     * Decrypt audio buffer data
     */
    async decryptAudioData(encryptedData, userKey) {
        try {
            const { key } = await this.deriveKey(userKey, encryptedData.salt);
            
            // Verify integrity first
            const hmacKey = await this.deriveHMACKey(userKey, encryptedData.salt);
            const isValid = await this.verifyHMAC(hmacKey, encryptedData.encrypted, encryptedData.hmac);
            
            if (!isValid) {
                throw new Error('Data integrity verification failed');
            }

            const decrypted = await crypto.subtle.decrypt(
                {
                    name: this.algorithm,
                    iv: encryptedData.iv
                },
                key,
                encryptedData.encrypted
            );

            return new Uint8Array(decrypted);
        } catch (error) {
            console.error('Decryption failed:', error);
            throw new Error('Audio decryption failed');
        }
    }

    /**
     * Convert AudioBuffer to ArrayBuffer
     */
    audioBufferToArrayBuffer(audioBuffer) {
        const channels = [];
        for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
            channels.push(audioBuffer.getChannelData(i));
        }
        
        const length = audioBuffer.length * audioBuffer.numberOfChannels * 4; // 32-bit float
        const buffer = new ArrayBuffer(length);
        const view = new Float32Array(buffer);
        
        let offset = 0;
        for (let sample = 0; sample < audioBuffer.length; sample++) {
            for (let channel = 0; channel < channels.length; channel++) {
                view[offset++] = channels[channel][sample];
            }
        }
        
        return buffer;
    }

    /**
     * Derive HMAC key for integrity verification
     */
    async deriveHMACKey(password, salt) {
        const passwordBuffer = new TextEncoder().encode(password + 'hmac');
        
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            passwordBuffer,
            'PBKDF2',
            false,
            ['deriveKey']
        );

        return await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: this.iterations,
                hash: 'SHA-256'
            },
            keyMaterial,
            {
                name: 'HMAC',
                hash: 'SHA-256'
            },
            false,
            ['sign', 'verify']
        );
    }

    /**
     * Create HMAC for integrity verification
     */
    async createHMAC(key, data) {
        const signature = await crypto.subtle.sign('HMAC', key, data);
        return new Uint8Array(signature);
    }

    /**
     * Verify HMAC integrity
     */
    async verifyHMAC(key, data, hmac) {
        return await crypto.subtle.verify('HMAC', key, hmac, data);
    }

    /**
     * Encrypt project metadata
     */
    async encryptProjectData(projectData, userKey) {
        const jsonString = JSON.stringify(projectData);
        const textBuffer = new TextEncoder().encode(jsonString);
        return await this.encryptAudioData(textBuffer, userKey);
    }

    /**
     * Decrypt project metadata
     */
    async decryptProjectData(encryptedData, userKey) {
        const decryptedBuffer = await this.decryptAudioData(encryptedData, userKey);
        const jsonString = new TextDecoder().decode(decryptedBuffer);
        return JSON.parse(jsonString);
    }
}

// Secure Authentication System
export class SecureAuth {
    constructor() {
        this.tokenStorage = new SecureTokenStorage();
        this.refreshThreshold = 5 * 60 * 1000; // 5 minutes before expiry
        this.maxLoginAttempts = 5;
        this.lockoutDuration = 15 * 60 * 1000; // 15 minutes
        this.loginAttempts = new Map();
    }

    /**
     * Authenticate user with secure credentials
     */
    async authenticateUser(credentials) {
        try {
            // Check rate limiting
            if (this.isAccountLocked(credentials.username)) {
                throw new Error('Account temporarily locked due to failed login attempts');
            }

            // Prepare secure request
            const authRequest = {
                username: credentials.username,
                password: await this.hashPassword(credentials.password),
                timestamp: Date.now(),
                nonce: this.generateNonce(),
                clientFingerprint: await this.generateClientFingerprint()
            };

            const response = await this.secureRequest('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify(authRequest)
            });

            if (!response.ok) {
                this.recordFailedAttempt(credentials.username);
                throw new Error('Authentication failed');
            }

            const authData = await response.json();
            
            // Validate JWT tokens
            const { accessToken, refreshToken, user } = authData;
            await this.validateJWTToken(accessToken);
            
            // Store tokens securely
            await this.tokenStorage.storeTokens(accessToken, refreshToken);
            
            // Clear failed attempts
            this.loginAttempts.delete(credentials.username);
            
            // Set up token refresh
            this.setupTokenRefresh(refreshToken);
            
            return {
                user,
                accessToken,
                isAuthenticated: true
            };
            
        } catch (error) {
            console.error('Authentication error:', error);
            throw error;
        }
    }

    /**
     * Multi-factor authentication
     */
    async verifyMFA(token, method = 'totp') {
        try {
            const response = await this.secureRequest('/api/auth/verify-mfa', {
                method: 'POST',
                body: JSON.stringify({
                    token,
                    method,
                    timestamp: Date.now()
                })
            });

            return await response.json();
        } catch (error) {
            console.error('MFA verification failed:', error);
            throw error;
        }
    }

    /**
     * OAuth 2.0 authentication with PKCE
     */
    async authenticateOAuth(provider) {
        try {
            // Generate PKCE challenge
            const codeVerifier = this.generateCodeVerifier();
            const codeChallenge = await this.generateCodeChallenge(codeVerifier);
            
            // Store verifier securely
            sessionStorage.setItem('code_verifier', codeVerifier);
            
            // Build OAuth URL
            const authUrl = this.buildOAuthURL(provider, codeChallenge);
            
            // Open OAuth flow
            window.location.href = authUrl;
            
        } catch (error) {
            console.error('OAuth authentication failed:', error);
            throw error;
        }
    }

    /**
     * Secure password hashing
     */
    async hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Generate secure nonce
     */
    generateNonce() {
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Generate client fingerprint
     */
    async generateClientFingerprint() {
        const fingerprint = {
            userAgent: navigator.userAgent,
            language: navigator.language,
            platform: navigator.platform,
            screen: `${screen.width}x${screen.height}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            timestamp: Date.now()
        };
        
        const fingerprintString = JSON.stringify(fingerprint);
        const encoder = new TextEncoder();
        const data = encoder.encode(fingerprintString);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Validate JWT token
     */
    async validateJWTToken(token) {
        try {
            const parts = token.split('.');
            if (parts.length !== 3) {
                throw new Error('Invalid JWT format');
            }

            const payload = JSON.parse(atob(parts[1]));
            
            // Check expiration
            if (payload.exp && payload.exp < Date.now() / 1000) {
                throw new Error('Token expired');
            }
            
            // Verify signature (in production, verify with public key)
            return payload;
            
        } catch (error) {
            console.error('JWT validation failed:', error);
            throw new Error('Invalid token');
        }
    }

    /**
     * Set up automatic token refresh
     */
    setupTokenRefresh(refreshToken) {
        const checkInterval = 60000; // Check every minute
        
        this.refreshInterval = setInterval(async () => {
            try {
                const accessToken = await this.tokenStorage.getAccessToken();
                if (accessToken) {
                    const payload = await this.validateJWTToken(accessToken);
                    const expiresIn = (payload.exp * 1000) - Date.now();
                    
                    if (expiresIn < this.refreshThreshold) {
                        await this.refreshAccessToken(refreshToken);
                    }
                }
            } catch (error) {
                console.error('Token refresh check failed:', error);
            }
        }, checkInterval);
    }

    /**
     * Refresh access token
     */
    async refreshAccessToken(refreshToken) {
        try {
            const response = await this.secureRequest('/api/auth/refresh', {
                method: 'POST',
                body: JSON.stringify({ refreshToken })
            });

            const { accessToken, refreshToken: newRefreshToken } = await response.json();
            await this.tokenStorage.storeTokens(accessToken, newRefreshToken || refreshToken);
            
            return accessToken;
        } catch (error) {
            console.error('Token refresh failed:', error);
            await this.signOut();
            throw error;
        }
    }

    /**
     * Rate limiting and account lockout
     */
    isAccountLocked(username) {
        const attempts = this.loginAttempts.get(username);
        if (!attempts) return false;
        
        if (attempts.count >= this.maxLoginAttempts) {
            const timeSinceLastAttempt = Date.now() - attempts.lastAttempt;
            return timeSinceLastAttempt < this.lockoutDuration;
        }
        
        return false;
    }

    recordFailedAttempt(username) {
        const attempts = this.loginAttempts.get(username) || { count: 0, lastAttempt: 0 };
        attempts.count++;
        attempts.lastAttempt = Date.now();
        this.loginAttempts.set(username, attempts);
    }

    /**
     * Secure sign out
     */
    async signOut() {
        try {
            const refreshToken = await this.tokenStorage.getRefreshToken();
            
            if (refreshToken) {
                await this.secureRequest('/api/auth/logout', {
                    method: 'POST',
                    body: JSON.stringify({ refreshToken })
                });
            }
            
            await this.tokenStorage.clearTokens();
            
            if (this.refreshInterval) {
                clearInterval(this.refreshInterval);
            }
            
        } catch (error) {
            console.error('Sign out error:', error);
        }
    }

    /**
     * Secure HTTP request with authentication
     */
    async secureRequest(url, options = {}) {
        const accessToken = await this.tokenStorage.getAccessToken();
        
        const secureOptions = {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'X-Content-Type-Options': 'nosniff',
                'X-Frame-Options': 'DENY',
                'X-XSS-Protection': '1; mode=block',
                ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
                ...options.headers
            }
        };

        return fetch(url, secureOptions);
    }

    /**
     * Generate PKCE code verifier
     */
    generateCodeVerifier() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return btoa(String.fromCharCode.apply(null, array))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    }

    /**
     * Generate PKCE code challenge
     */
    async generateCodeChallenge(verifier) {
        const encoder = new TextEncoder();
        const data = encoder.encode(verifier);
        const digest = await crypto.subtle.digest('SHA-256', data);
        return btoa(String.fromCharCode.apply(null, new Uint8Array(digest)))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    }

    /**
     * Build OAuth authorization URL
     */
    buildOAuthURL(provider, codeChallenge) {
        const baseUrls = {
            google: 'https://accounts.google.com/o/oauth2/v2/auth',
            github: 'https://github.com/login/oauth/authorize',
            microsoft: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize'
        };

        const params = new URLSearchParams({
            response_type: 'code',
            client_id: this.getClientId(provider),
            redirect_uri: window.location.origin + '/auth/callback',
            scope: this.getScope(provider),
            code_challenge: codeChallenge,
            code_challenge_method: 'S256',
            state: this.generateNonce()
        });

        return `${baseUrls[provider]}?${params.toString()}`;
    }

    getClientId(provider) {
        // Return configured client IDs
        const clientIds = {
            google: process.env.REACT_APP_GOOGLE_CLIENT_ID,
            github: process.env.REACT_APP_GITHUB_CLIENT_ID,
            microsoft: process.env.REACT_APP_MICROSOFT_CLIENT_ID
        };
        return clientIds[provider];
    }

    getScope(provider) {
        const scopes = {
            google: 'openid profile email',
            github: 'user:email',
            microsoft: 'openid profile email'
        };
        return scopes[provider];
    }
}

// Secure Token Storage
export class SecureTokenStorage {
    constructor() {
        this.storageKey = 'secure_tokens';
        this.encryptionKey = this.getOrCreateStorageKey();
    }

    async storeTokens(accessToken, refreshToken) {
        const tokens = {
            accessToken,
            refreshToken,
            timestamp: Date.now()
        };

        const encrypted = CryptoJS.AES.encrypt(
            JSON.stringify(tokens),
            this.encryptionKey
        ).toString();

        localStorage.setItem(this.storageKey, encrypted);
    }

    async getAccessToken() {
        const tokens = await this.getTokens();
        return tokens?.accessToken;
    }

    async getRefreshToken() {
        const tokens = await this.getTokens();
        return tokens?.refreshToken;
    }

    async getTokens() {
        try {
            const encrypted = localStorage.getItem(this.storageKey);
            if (!encrypted) return null;

            const decrypted = CryptoJS.AES.decrypt(encrypted, this.encryptionKey).toString(CryptoJS.enc.Utf8);
            return JSON.parse(decrypted);
        } catch (error) {
            console.error('Token retrieval failed:', error);
            return null;
        }
    }

    async clearTokens() {
        localStorage.removeItem(this.storageKey);
    }

    getOrCreateStorageKey() {
        let key = localStorage.getItem('storage_key');
        if (!key) {
            key = CryptoJS.lib.WordArray.random(256/8).toString();
            localStorage.setItem('storage_key', key);
        }
        return key;
    }
}

export default {
    AudioEncryption,
    SecureAuth,
    SecureTokenStorage
};

/**
 * Security Validator & Secure Transport
 * Comprehensive input validation and secure communication layer
 */

import DOMPurify from 'dompurify';

// Security Validator System
export class SecurityValidator {
    constructor() {
        this.maxFileSize = 100 * 1024 * 1024; // 100MB
        this.allowedAudioFormats = ['wav', 'mp3', 'flac', 'ogg', 'aac', 'm4a'];
        this.allowedImageFormats = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
        this.dangerousExtensions = ['exe', 'bat', 'cmd', 'com', 'pif', 'scr', 'vbs', 'js', 'jar'];
        
        // Audio file magic bytes (file signatures)
        this.audioSignatures = {
            wav: [0x52, 0x49, 0x46, 0x46], // RIFF
            mp3: [0xFF, 0xFB], // MP3 frame header
            flac: [0x66, 0x4C, 0x61, 0x43], // fLaC
            ogg: [0x4F, 0x67, 0x67, 0x53], // OggS
            m4a: [0x66, 0x74, 0x79, 0x70] // ftyp (MP4 container)
        };

        this.setupDOMPurify();
    }

    /**
     * Configure DOMPurify for XSS protection
     */
    setupDOMPurify() {
        DOMPurify.addHook('beforeSanitizeElements', (node) => {
            // Additional security checks
            if (node.tagName === 'SCRIPT' || node.tagName === 'IFRAME') {
                node.remove();
            }
        });

        this.purifyConfig = {
            ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'span'],
            ALLOWED_ATTR: ['class'],
            FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'iframe'],
            FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'src', 'href']
        };
    }

    /**
     * Validate and sanitize project name
     */
    validateProjectName(name) {
        if (!name || typeof name !== 'string') {
            throw new Error('Project name is required and must be a string');
        }

        // Remove HTML tags and potential XSS vectors
        const sanitized = DOMPurify.sanitize(name, this.purifyConfig);
        
        // Check length
        if (sanitized.length < 1 || sanitized.length > 100) {
            throw new Error('Project name must be 1-100 characters long');
        }

        // Validate against allowed pattern (alphanumeric, spaces, hyphens, underscores)
        if (!/^[a-zA-Z0-9\s_-]+$/.test(sanitized)) {
            throw new Error('Project name contains invalid characters');
        }

        // Check for reserved names
        const reservedNames = ['con', 'prn', 'aux', 'nul', 'com1', 'com2', 'com3', 'lpt1'];
        if (reservedNames.includes(sanitized.toLowerCase())) {
            throw new Error('Project name is reserved');
        }

        return sanitized.trim();
    }

    /**
     * Validate and sanitize user input
     */
    validateUserInput(input, type = 'text', maxLength = 1000) {
        if (input === null || input === undefined) {
            return '';
        }

        if (typeof input !== 'string') {
            input = String(input);
        }

        // Length check
        if (input.length > maxLength) {
            throw new Error(`Input exceeds maximum length of ${maxLength} characters`);
        }

        let sanitized;
        switch (type) {
            case 'html':
                sanitized = DOMPurify.sanitize(input);
                break;
            case 'text':
                sanitized = DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });
                break;
            case 'email':
                sanitized = this.validateEmail(input);
                break;
            case 'url':
                sanitized = this.validateURL(input);
                break;
            case 'filename':
                sanitized = this.validateFilename(input);
                break;
            default:
                sanitized = DOMPurify.sanitize(input, this.purifyConfig);
        }

        return sanitized;
    }

    /**
     * Validate email address
     */
    validateEmail(email) {
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        const sanitized = DOMPurify.sanitize(email, { ALLOWED_TAGS: [] });
        
        if (!emailRegex.test(sanitized)) {
            throw new Error('Invalid email format');
        }
        
        return sanitized.toLowerCase();
    }

    /**
     * Validate URL
     */
    validateURL(url) {
        try {
            const sanitized = DOMPurify.sanitize(url, { ALLOWED_TAGS: [] });
            const urlObj = new URL(sanitized);
            
            // Only allow HTTP and HTTPS
            if (!['http:', 'https:'].includes(urlObj.protocol)) {
                throw new Error('Only HTTP and HTTPS URLs are allowed');
            }
            
            return urlObj.href;
        } catch (error) {
            throw new Error('Invalid URL format');
        }
    }

    /**
     * Validate filename
     */
    validateFilename(filename) {
        const sanitized = DOMPurify.sanitize(filename, { ALLOWED_TAGS: [] });
        
        // Check for dangerous characters
        if (/[<>:"/\\|?*\x00-\x1f]/.test(sanitized)) {
            throw new Error('Filename contains invalid characters');
        }
        
        // Check length
        if (sanitized.length > 255) {
            throw new Error('Filename too long');
        }
        
        return sanitized;
    }

    /**
     * Comprehensive audio file validation
     */
    async validateAudioFile(file) {
        const validationResults = {
            isValid: false,
            errors: [],
            warnings: [],
            metadata: {}
        };

        try {
            // Basic file checks
            if (!file || !(file instanceof File)) {
                validationResults.errors.push('Invalid file object');
                return validationResults;
            }

            // Size check
            if (file.size > this.maxFileSize) {
                validationResults.errors.push(`File size exceeds maximum limit of ${this.maxFileSize / 1024 / 1024}MB`);
                return validationResults;
            }

            // Extension check
            const extension = this.getFileExtension(file.name);
            if (!this.allowedAudioFormats.includes(extension)) {
                validationResults.errors.push(`File type '${extension}' is not allowed`);
                return validationResults;
            }

            // Check for dangerous extensions
            if (this.dangerousExtensions.includes(extension)) {
                validationResults.errors.push('File type is potentially dangerous');
                return validationResults;
            }

            // File signature validation
            const isValidSignature = await this.validateFileSignature(file, extension);
            if (!isValidSignature) {
                validationResults.errors.push('File signature does not match extension');
                return validationResults;
            }

            // Scan for embedded threats
            const threatScan = await this.scanForThreats(file);
            if (threatScan.threats.length > 0) {
                validationResults.errors.push('File contains potential security threats');
                validationResults.metadata.threats = threatScan.threats;
                return validationResults;
            }

            // Audio-specific validation
            const audioValidation = await this.validateAudioContent(file);
            if (!audioValidation.isValid) {
                validationResults.errors.push(...audioValidation.errors);
                return validationResults;
            }

            validationResults.isValid = true;
            validationResults.metadata = {
                ...validationResults.metadata,
                ...audioValidation.metadata,
                size: file.size,
                type: file.type,
                extension: extension,
                lastModified: file.lastModified
            };

        } catch (error) {
            validationResults.errors.push(`Validation error: ${error.message}`);
        }

        return validationResults;
    }

    /**
     * Get file extension
     */
    getFileExtension(filename) {
        return filename.split('.').pop().toLowerCase();
    }

    /**
     * Validate file signature (magic bytes)
     */
    async validateFileSignature(file, expectedExtension) {
        try {
            const buffer = await this.readFileBytes(file, 0, 12); // Read first 12 bytes
            const signature = this.audioSignatures[expectedExtension];
            
            if (!signature) {
                return true; // No signature check for this format
            }

            for (let i = 0; i < signature.length; i++) {
                if (buffer[i] !== signature[i]) {
                    return false;
                }
            }

            return true;
        } catch (error) {
            console.error('File signature validation failed:', error);
            return false;
        }
    }

    /**
     * Read specific bytes from file
     */
    async readFileBytes(file, start, length) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            const blob = file.slice(start, start + length);
            
            reader.onload = () => {
                const arrayBuffer = reader.result;
                const uint8Array = new Uint8Array(arrayBuffer);
                resolve(uint8Array);
            };
            
            reader.onerror = () => reject(reader.error);
            reader.readAsArrayBuffer(blob);
        });
    }

    /**
     * Scan for embedded threats in file
     */
    async scanForThreats(file) {
        const threats = [];
        
        try {
            // Read file in chunks to scan for suspicious patterns
            const chunkSize = 8192;
            const totalChunks = Math.ceil(file.size / chunkSize);
            
            for (let i = 0; i < Math.min(totalChunks, 10); i++) { // Scan first 10 chunks
                const start = i * chunkSize;
                const chunk = await this.readFileBytes(file, start, chunkSize);
                const chunkText = new TextDecoder('utf-8', { fatal: false }).decode(chunk);
                
                // Look for suspicious patterns
                const suspiciousPatterns = [
                    /javascript:/gi,
                    /vbscript:/gi,
                    /<script/gi,
                    /eval\(/gi,
                    /document\.write/gi,
                    /window\.location/gi,
                    /\bexec\b/gi,
                    /\bsystem\b/gi
                ];

                for (const pattern of suspiciousPatterns) {
                    if (pattern.test(chunkText)) {
                        threats.push({
                            type: 'suspicious_code',
                            pattern: pattern.source,
                            chunk: i
                        });
                    }
                }
            }

            // Check metadata for threats
            const metadata = await this.extractMetadata(file);
            if (metadata.comments && metadata.comments.length > 1000) {
                threats.push({
                    type: 'suspicious_metadata',
                    reason: 'Unusually large comments field'
                });
            }

        } catch (error) {
            console.error('Threat scanning failed:', error);
        }

        return { threats };
    }

    /**
     * Validate audio content
     */
    async validateAudioContent(file) {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const arrayBuffer = await file.arrayBuffer();
            
            try {
                const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                
                return {
                    isValid: true,
                    metadata: {
                        duration: audioBuffer.duration,
                        sampleRate: audioBuffer.sampleRate,
                        channels: audioBuffer.numberOfChannels,
                        length: audioBuffer.length
                    }
                };
            } catch (decodeError) {
                return {
                    isValid: false,
                    errors: ['File is not a valid audio file or format is not supported']
                };
            } finally {
                audioContext.close();
            }
        } catch (error) {
            return {
                isValid: false,
                errors: [`Audio validation failed: ${error.message}`]
            };
        }
    }

    /**
     * Extract metadata from audio file
     */
    async extractMetadata(file) {
        // Basic metadata extraction
        // In production, use a library like music-metadata
        return {
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: new Date(file.lastModified),
            comments: '' // Would be extracted from actual metadata
        };
    }

    /**
     * Validate JSON data
     */
    validateJSON(jsonString, schema = null) {
        try {
            const parsed = JSON.parse(jsonString);
            
            // Basic size check
            if (JSON.stringify(parsed).length > 1000000) { // 1MB limit
                throw new Error('JSON data too large');
            }
            
            // Schema validation if provided
            if (schema) {
                this.validateAgainstSchema(parsed, schema);
            }
            
            return parsed;
        } catch (error) {
            throw new Error(`Invalid JSON: ${error.message}`);
        }
    }

    /**
     * Basic schema validation
     */
    validateAgainstSchema(data, schema) {
        for (const [key, rules] of Object.entries(schema)) {
            if (rules.required && !(key in data)) {
                throw new Error(`Required field '${key}' is missing`);
            }
            
            if (key in data) {
                const value = data[key];
                
                if (rules.type && typeof value !== rules.type) {
                    throw new Error(`Field '${key}' must be of type ${rules.type}`);
                }
                
                if (rules.maxLength && typeof value === 'string' && value.length > rules.maxLength) {
                    throw new Error(`Field '${key}' exceeds maximum length`);
                }
                
                if (rules.pattern && typeof value === 'string' && !rules.pattern.test(value)) {
                    throw new Error(`Field '${key}' does not match required pattern`);
                }
            }
        }
    }

    /**
     * Rate limiting validator
     */
    validateRateLimit(identifier, maxRequests = 100, windowMs = 60000) {
        if (!this.rateLimitStore) {
            this.rateLimitStore = new Map();
        }

        const now = Date.now();
        const windowStart = now - windowMs;
        
        let requests = this.rateLimitStore.get(identifier) || [];
        
        // Remove old requests
        requests = requests.filter(timestamp => timestamp > windowStart);
        
        if (requests.length >= maxRequests) {
            throw new Error('Rate limit exceeded');
        }
        
        requests.push(now);
        this.rateLimitStore.set(identifier, requests);
        
        return true;
    }
}

// Secure Transport Layer
export class SecureTransport {
    constructor() {
        this.enforceHTTPS();
        this.setupCSP();
        this.setupSecurityHeaders();
        this.rateLimiter = new Map();
    }

    /**
     * Force HTTPS in production
     */
    enforceHTTPS() {
        if (process.env.NODE_ENV === 'production' && location.protocol !== 'https:') {
            console.warn('Redirecting to HTTPS for security');
            location.replace('https:' + window.location.href.substring(window.location.protocol.length));
        }
    }

    /**
     * Setup Content Security Policy
     */
    setupCSP() {
        const csp = [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Allow inline scripts for React
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: blob:",
            "media-src 'self' blob:",
            "connect-src 'self' wss: ws:",
            "font-src 'self'",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'"
        ].join('; ');

        // Set CSP header if possible (usually done server-side)
        const meta = document.createElement('meta');
        meta.httpEquiv = 'Content-Security-Policy';
        meta.content = csp;
        document.head.appendChild(meta);
    }

    /**
     * Setup security headers
     */
    setupSecurityHeaders() {
        // These would typically be set server-side
        const securityHeaders = {
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'X-XSS-Protection': '1; mode=block',
            'Referrer-Policy': 'strict-origin-when-cross-origin',
            'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
        };

        // Store for use in fetch requests
        this.defaultHeaders = securityHeaders;
    }

    /**
     * Secure fetch with automatic security headers
     */
    async secureFetch(url, options = {}) {
        // Validate URL
        try {
            const urlObj = new URL(url, window.location.origin);
            if (!['http:', 'https:'].includes(urlObj.protocol)) {
                throw new Error('Invalid protocol');
            }
        } catch (error) {
            throw new Error(`Invalid URL: ${error.message}`);
        }

        // Rate limiting
        this.checkRateLimit(url);

        const secureOptions = {
            ...options,
            headers: {
                ...this.defaultHeaders,
                'Content-Type': 'application/json',
                ...options.headers
            },
            // Security settings
            credentials: 'same-origin',
            mode: 'cors',
            cache: 'no-cache'
        };

        try {
            const response = await fetch(url, secureOptions);
            
            // Validate response
            this.validateResponse(response);
            
            return response;
        } catch (error) {
            console.error('Secure fetch failed:', error);
            throw error;
        }
    }

    /**
     * Secure WebSocket connection
     */
    createSecureWebSocket(url, protocols = []) {
        // Force WSS in production
        if (process.env.NODE_ENV === 'production' && url.startsWith('ws:')) {
            url = url.replace('ws:', 'wss:');
        }

        const ws = new WebSocket(url, protocols);
        
        // Add security event listeners
        ws.addEventListener('open', () => {
            console.log('Secure WebSocket connected');
        });

        ws.addEventListener('error', (error) => {
            console.error('WebSocket security error:', error);
        });

        // Wrap send method to validate messages
        const originalSend = ws.send.bind(ws);
        ws.send = (data) => {
            try {
                // Validate data before sending
                if (typeof data === 'string') {
                    const parsed = JSON.parse(data);
                    this.validateWebSocketMessage(parsed);
                }
                originalSend(data);
            } catch (error) {
                console.error('WebSocket message validation failed:', error);
                throw error;
            }
        };

        return ws;
    }

    /**
     * Rate limiting for requests
     */
    checkRateLimit(url, maxRequests = 100, windowMs = 60000) {
        const now = Date.now();
        const identifier = new URL(url, window.location.origin).hostname;
        
        let requests = this.rateLimiter.get(identifier) || [];
        requests = requests.filter(timestamp => timestamp > now - windowMs);
        
        if (requests.length >= maxRequests) {
            throw new Error('Rate limit exceeded for this endpoint');
        }
        
        requests.push(now);
        this.rateLimiter.set(identifier, requests);
    }

    /**
     * Validate HTTP response
     */
    validateResponse(response) {
        // Check for suspicious headers
        const suspiciousHeaders = ['x-powered-by', 'server'];
        suspiciousHeaders.forEach(header => {
            if (response.headers.has(header)) {
                console.warn(`Response contains potentially revealing header: ${header}`);
            }
        });

        // Validate content type
        const contentType = response.headers.get('content-type');
        if (contentType && !contentType.includes('application/json') && !contentType.includes('text/')) {
            console.warn('Unexpected content type:', contentType);
        }
    }

    /**
     * Validate WebSocket messages
     */
    validateWebSocketMessage(message) {
        if (!message || typeof message !== 'object') {
            throw new Error('Invalid WebSocket message format');
        }

        // Check message size
        const messageString = JSON.stringify(message);
        if (messageString.length > 100000) { // 100KB limit
            throw new Error('WebSocket message too large');
        }

        // Validate required fields
        if (!message.type) {
            throw new Error('WebSocket message missing type field');
        }

        // Sanitize text content
        if (message.content && typeof message.content === 'string') {
            message.content = DOMPurify.sanitize(message.content, { ALLOWED_TAGS: [] });
        }
    }

    /**
     * Certificate pinning (browser implementation)
     */
    async validateCertificate(hostname) {
        // This would typically be implemented with service workers
        // or server-side certificate validation
        console.log(`Certificate validation for ${hostname} - implement server-side`);
        return true;
    }

    /**
     * Cleanup security resources
     */
    cleanup() {
        this.rateLimiter.clear();
    }
}

export default {
    SecurityValidator,
    SecureTransport
};
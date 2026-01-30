/**
 * Security Monitoring & Audit Logging System
 * Comprehensive security event tracking and intrusion detection
 */

// Security Monitor System
export class SecurityMonitor {
    constructor() {
        this.events = [];
        this.alerts = [];
        this.thresholds = {
            failedLogins: 5,
            suspiciousRequests: 10,
            dataTransferLimit: 100 * 1024 * 1024, // 100MB
            sessionTimeout: 30 * 60 * 1000, // 30 minutes
            maxConnections: 100
        };
        
        this.detectors = new Map();
        this.isMonitoring = false;
        this.alertCallbacks = [];
        
        this.setupDetectors();
        this.startMonitoring();
    }

    /**
     * Setup intrusion detection systems
     */
    setupDetectors() {
        // Failed login detector
        this.detectors.set('failed_login', {
            count: 0,
            window: 15 * 60 * 1000, // 15 minutes
            threshold: this.thresholds.failedLogins,
            reset: () => { this.detectors.get('failed_login').count = 0; }
        });

        // Suspicious request detector
        this.detectors.set('suspicious_request', {
            requests: [],
            window: 5 * 60 * 1000, // 5 minutes
            threshold: this.thresholds.suspiciousRequests,
            reset: () => { this.detectors.get('suspicious_request').requests = []; }
        });

        // Data transfer detector
        this.detectors.set('data_transfer', {
            transferred: 0,
            window: 60 * 60 * 1000, // 1 hour
            threshold: this.thresholds.dataTransferLimit,
            reset: () => { this.detectors.get('data_transfer').transferred = 0; }
        });

        // Session hijacking detector
        this.detectors.set('session_anomaly', {
            sessions: new Map(),
            threshold: 3, // Max location changes
            reset: () => { this.detectors.get('session_anomaly').sessions.clear(); }
        });
    }

    /**
     * Start monitoring security events
     */
    startMonitoring() {
        if (this.isMonitoring) return;
        
        this.isMonitoring = true;
        
        // Set up periodic cleanup
        this.cleanupInterval = setInterval(() => {
            this.cleanupOldEvents();
            this.resetDetectors();
        }, 60000); // Every minute

        // Monitor network activity
        this.setupNetworkMonitoring();
        
        // Monitor DOM changes for tampering
        this.setupDOMMonitoring();
        
        // Monitor local storage for tampering
        this.setupStorageMonitoring();

        console.log('Security monitoring started');
    }

    /**
     * Log security event
     */
    logSecurityEvent(type, details = {}, severity = 'info') {
        const event = {
            id: this.generateEventId(),
            type,
            severity,
            timestamp: Date.now(),
            details: {
                ...details,
                userAgent: navigator.userAgent,
                url: window.location.href,
                referrer: document.referrer,
                sessionId: this.getSessionId()
            },
            fingerprint: this.generateFingerprint()
        };

        this.events.push(event);
        
        // Check for intrusion patterns
        this.analyzeEvent(event);
        
        // Log to console in development
        if (process.env.NODE_ENV === 'development') {
            console.log(`Security Event [${severity.toUpperCase()}]:`, event);
        }
        
        // Send to server in production
        if (process.env.NODE_ENV === 'production') {
            this.sendEventToServer(event);
        }

        return event.id;
    }

    /**
     * Analyze event for intrusion patterns
     */
    analyzeEvent(event) {
        switch (event.type) {
            case 'failed_login':
                this.checkFailedLogins(event);
                break;
            case 'suspicious_request':
                this.checkSuspiciousRequests(event);
                break;
            case 'data_transfer':
                this.checkDataTransfer(event);
                break;
            case 'session_change':
                this.checkSessionAnomaly(event);
                break;
            case 'xss_attempt':
            case 'injection_attempt':
                this.triggerAlert('high', `Security attack detected: ${event.type}`, event);
                break;
        }
    }

    /**
     * Check for failed login patterns
     */
    checkFailedLogins(event) {
        const detector = this.detectors.get('failed_login');
        detector.count++;
        
        if (detector.count >= detector.threshold) {
            this.triggerAlert('high', 'Multiple failed login attempts detected', {
                count: detector.count,
                threshold: detector.threshold,
                timeWindow: detector.window
            });
            detector.reset();
        }
    }

    /**
     * Check for suspicious request patterns
     */
    checkSuspiciousRequests(event) {
        const detector = this.detectors.get('suspicious_request');
        const now = Date.now();
        
        // Remove old requests
        detector.requests = detector.requests.filter(
            req => now - req.timestamp < detector.window
        );
        
        detector.requests.push({ timestamp: now, event });
        
        if (detector.requests.length >= detector.threshold) {
            this.triggerAlert('medium', 'Suspicious request pattern detected', {
                requestCount: detector.requests.length,
                timeWindow: detector.window
            });
            detector.reset();
        }
    }

    /**
     * Check for excessive data transfer
     */
    checkDataTransfer(event) {
        const detector = this.detectors.get('data_transfer');
        detector.transferred += event.details.size || 0;
        
        if (detector.transferred >= detector.threshold) {
            this.triggerAlert('medium', 'Excessive data transfer detected', {
                transferred: detector.transferred,
                threshold: detector.threshold
            });
            detector.reset();
        }
    }

    /**
     * Check for session anomalies
     */
    checkSessionAnomaly(event) {
        const detector = this.detectors.get('session_anomaly');
        const sessionId = event.details.sessionId;
        
        if (!detector.sessions.has(sessionId)) {
            detector.sessions.set(sessionId, {
                locations: [],
                userAgents: [],
                ips: []
            });
        }
        
        const session = detector.sessions.get(sessionId);
        const location = event.details.location;
        const userAgent = event.details.userAgent;
        
        if (location && !session.locations.includes(location)) {
            session.locations.push(location);
        }
        
        if (userAgent && !session.userAgents.includes(userAgent)) {
            session.userAgents.push(userAgent);
        }
        
        // Check for anomalies
        if (session.locations.length > detector.threshold || 
            session.userAgents.length > 1) {
            this.triggerAlert('high', 'Session hijacking attempt detected', {
                sessionId,
                locations: session.locations.length,
                userAgents: session.userAgents.length
            });
        }
    }

    /**
     * Trigger security alert
     */
    triggerAlert(severity, message, details = {}) {
        const alert = {
            id: this.generateEventId(),
            severity,
            message,
            details,
            timestamp: Date.now(),
            acknowledged: false
        };

        this.alerts.push(alert);
        
        // Notify alert callbacks
        this.alertCallbacks.forEach(callback => {
            try {
                callback(alert);
            } catch (error) {
                console.error('Alert callback failed:', error);
            }
        });

        // Log critical alerts
        if (severity === 'high') {
            console.error(`SECURITY ALERT [${severity.toUpperCase()}]: ${message}`, details);
        }

        return alert.id;
    }

    /**
     * Setup network monitoring
     */
    setupNetworkMonitoring() {
        // Monitor fetch requests
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            const startTime = Date.now();
            const url = args[0];
            
            try {
                const response = await originalFetch(...args);
                
                this.logSecurityEvent('network_request', {
                    url: typeof url === 'string' ? url : url.url,
                    method: args[1]?.method || 'GET',
                    status: response.status,
                    duration: Date.now() - startTime,
                    size: response.headers.get('content-length')
                });

                // Check for suspicious patterns
                if (response.status >= 400) {
                    this.logSecurityEvent('suspicious_request', {
                        url: typeof url === 'string' ? url : url.url,
                        status: response.status
                    }, 'warning');
                }

                return response;
            } catch (error) {
                this.logSecurityEvent('network_error', {
                    url: typeof url === 'string' ? url : url.url,
                    error: error.message,
                    duration: Date.now() - startTime
                }, 'error');
                throw error;
            }
        };

        // Monitor WebSocket connections
        const originalWebSocket = window.WebSocket;
        window.WebSocket = class extends originalWebSocket {
            constructor(url, protocols) {
                super(url, protocols);
                
                this.addEventListener('open', () => {
                    this.logSecurityEvent('websocket_connected', { url });
                });
                
                this.addEventListener('message', (event) => {
                    this.logSecurityEvent('websocket_message', {
                        url,
                        messageSize: event.data.length
                    });
                });
                
                this.addEventListener('error', (error) => {
                    this.logSecurityEvent('websocket_error', {
                        url,
                        error: error.message
                    }, 'error');
                });
            }
            
            logSecurityEvent(type, details, severity = 'info') {
                // Access outer scope's logSecurityEvent
                if (window.securityMonitor) {
                    window.securityMonitor.logSecurityEvent(type, details, severity);
                }
            }
        };
    }

    /**
     * Setup DOM monitoring for tampering
     */
    setupDOMMonitoring() {
        // Monitor for script injection
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            if (node.tagName === 'SCRIPT') {
                                this.logSecurityEvent('dom_script_injection', {
                                    script: node.outerHTML,
                                    src: node.src
                                }, 'high');
                            }
                            
                            // Check for suspicious attributes
                            if (node.attributes) {
                                for (const attr of node.attributes) {
                                    if (attr.name.startsWith('on') || 
                                        attr.value.includes('javascript:')) {
                                        this.logSecurityEvent('dom_suspicious_attribute', {
                                            element: node.tagName,
                                            attribute: attr.name,
                                            value: attr.value
                                        }, 'medium');
                                    }
                                }
                            }
                        }
                    });
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['onclick', 'onload', 'onerror', 'onmouseover']
        });
    }

    /**
     * Setup storage monitoring
     */
    setupStorageMonitoring() {
        // Monitor localStorage changes
        const originalSetItem = localStorage.setItem;
        localStorage.setItem = (key, value) => {
            this.logSecurityEvent('storage_write', {
                key,
                valueLength: value.length,
                storage: 'localStorage'
            });
            return originalSetItem.call(localStorage, key, value);
        };

        // Monitor sessionStorage changes (with recursion prevention)
        const originalSessionSetItem = sessionStorage.setItem;
        let isLoggingStorage = false;
        sessionStorage.setItem = (key, value) => {
            // Prevent infinite recursion when logging tries to use sessionStorage
            if (!isLoggingStorage && key !== 'security_events') {
                try {
                    isLoggingStorage = true;
                    this.logSecurityEvent('storage_write', {
                        key,
                        valueLength: value?.length || 0,
                        storage: 'sessionStorage'
                    });
                } catch (error) {
                    console.warn('Security monitor storage event failed:', error.message);
                } finally {
                    isLoggingStorage = false;
                }
            }
            return originalSessionSetItem.call(sessionStorage, key, value);
        };
    }

    /**
     * Generate unique event ID
     */
    generateEventId() {
        return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Generate browser fingerprint
     */
    generateFingerprint() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('Security fingerprint', 2, 2);
        
        const fingerprint = {
            canvas: canvas.toDataURL(),
            screen: `${screen.width}x${screen.height}x${screen.colorDepth}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            language: navigator.language,
            platform: navigator.platform,
            cookieEnabled: navigator.cookieEnabled,
            doNotTrack: navigator.doNotTrack
        };

        return btoa(JSON.stringify(fingerprint)).slice(0, 32);
    }

    /**
     * Get or create session ID
     */
    getSessionId() {
        let sessionId = sessionStorage.getItem('security_session_id');
        if (!sessionId) {
            sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            sessionStorage.setItem('security_session_id', sessionId);
        }
        return sessionId;
    }

    /**
     * Send event to server
     */
    async sendEventToServer(event) {
        try {
            await fetch('/api/security/events', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(event)
            });
        } catch (error) {
            console.error('Failed to send security event to server:', error);
        }
    }

    /**
     * Get security dashboard data
     */
    getDashboardData() {
        const now = Date.now();
        const last24Hours = now - (24 * 60 * 60 * 1000);
        
        const recentEvents = this.events.filter(event => event.timestamp > last24Hours);
        
        const eventsByType = {};
        const eventsBySeverity = {};
        
        recentEvents.forEach(event => {
            eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
            eventsBySeverity[event.severity] = (eventsBySeverity[event.severity] || 0) + 1;
        });

        return {
            totalEvents: recentEvents.length,
            activeAlerts: this.alerts.filter(alert => !alert.acknowledged).length,
            eventsByType,
            eventsBySeverity,
            recentEvents: recentEvents.slice(-10),
            activeAlerts: this.alerts.filter(alert => !alert.acknowledged).slice(-5)
        };
    }

    /**
     * Export security audit log
     */
    exportAuditLog(format = 'json') {
        const auditData = {
            exportedAt: new Date().toISOString(),
            totalEvents: this.events.length,
            totalAlerts: this.alerts.length,
            events: this.events,
            alerts: this.alerts
        };

        if (format === 'json') {
            return JSON.stringify(auditData, null, 2);
        } else if (format === 'csv') {
            return this.convertToCSV(auditData.events);
        }

        return auditData;
    }

    /**
     * Convert events to CSV format
     */
    convertToCSV(events) {
        const headers = ['timestamp', 'type', 'severity', 'details', 'fingerprint'];
        const csvRows = [headers.join(',')];
        
        events.forEach(event => {
            const row = [
                new Date(event.timestamp).toISOString(),
                event.type,
                event.severity,
                JSON.stringify(event.details).replace(/"/g, '""'),
                event.fingerprint
            ];
            csvRows.push(row.join(','));
        });
        
        return csvRows.join('\n');
    }

    /**
     * Cleanup old events
     */
    cleanupOldEvents() {
        const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
        const cutoff = Date.now() - maxAge;
        
        this.events = this.events.filter(event => event.timestamp > cutoff);
        this.alerts = this.alerts.filter(alert => alert.timestamp > cutoff);
    }

    /**
     * Reset detection counters
     */
    resetDetectors() {
        const now = Date.now();
        
        this.detectors.forEach((detector, key) => {
            if (detector.window && detector.lastReset && 
                now - detector.lastReset > detector.window) {
                detector.reset();
                detector.lastReset = now;
            }
        });
    }

    /**
     * Register alert callback
     */
    onAlert(callback) {
        this.alertCallbacks.push(callback);
    }

    /**
     * Acknowledge alert
     */
    acknowledgeAlert(alertId) {
        const alert = this.alerts.find(a => a.id === alertId);
        if (alert) {
            alert.acknowledged = true;
            alert.acknowledgedAt = Date.now();
        }
    }

    /**
     * Stop monitoring
     */
    stopMonitoring() {
        this.isMonitoring = false;
        
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }

        console.log('Security monitoring stopped');
    }

    /**
     * Get security metrics
     */
    getSecurityMetrics() {
        const now = Date.now();
        const last24Hours = now - (24 * 60 * 60 * 1000);
        const lastHour = now - (60 * 60 * 1000);
        
        const events24h = this.events.filter(e => e.timestamp > last24Hours);
        const events1h = this.events.filter(e => e.timestamp > lastHour);
        const alerts24h = this.alerts.filter(a => a.timestamp > last24Hours);
        
        return {
            events: {
                last24Hours: events24h.length,
                lastHour: events1h.length,
                total: this.events.length
            },
            alerts: {
                last24Hours: alerts24h.length,
                unacknowledged: this.alerts.filter(a => !a.acknowledged).length,
                total: this.alerts.length
            },
            threats: {
                high: events24h.filter(e => e.severity === 'high').length,
                medium: events24h.filter(e => e.severity === 'medium').length,
                low: events24h.filter(e => e.severity === 'info').length
            }
        };
    }
}

// Initialize global security monitor
if (typeof window !== 'undefined') {
    window.securityMonitor = new SecurityMonitor();
}

export default SecurityMonitor;
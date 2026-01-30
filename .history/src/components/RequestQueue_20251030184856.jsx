import React, { useState, useEffect } from 'react';
import './RequestQueue.css';
import QRCode from 'qrcode';

/**
 * Request Queue Panel - Shows crowd song requests with voting
 * DJ can accept, reject, or reorder requests
 */
export default function RequestQueue({ onClose, onLoadTrack }) {
  const [serverStatus, setServerStatus] = useState({
    isRunning: false,
    url: null,
    connections: 0,
    requestCount: 0
  });
  const [requests, setRequests] = useState([]);
  const [showQR, setShowQR] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  useEffect(() => {
    checkServerStatus();
    
    // Listen for new requests from server
    const handleNewRequest = (request) => {
      console.log('[RequestQueue] New request received:', request);
      setRequests(prev => {
        const updated = [...prev, request];
        console.log('[RequestQueue] Updated requests:', updated);
        return updated;
      });
      console.log('[RequestQueue] Request added to queue');
    };

    // Listen for request updates (votes, status changes)
    const handleRequestUpdate = (updatedRequests) => {
      console.log('[RequestQueue] Requests updated:', updatedRequests);
      setRequests(updatedRequests);
    };

    if (window.electronAPI?.receive) {
      console.log('[RequestQueue] Setting up listeners');
      window.electronAPI.receive('request-server:newRequest', handleNewRequest);
      window.electronAPI.receive('request-server:requestsUpdated', handleRequestUpdate);
    } else {
      console.warn('[RequestQueue] electronAPI.receive not available');
    }

    return () => {
      if (window.electronAPI?.removeAllListeners) {
        window.electronAPI.removeAllListeners('request-server:newRequest');
        window.electronAPI.removeAllListeners('request-server:requestsUpdated');
      }
    };
  }, []);

  const checkServerStatus = async () => {
    try {
      if (!window.api?.invoke) {
        console.warn('[RequestQueue] Request server API not available (Electron IPC not initialized)');
        return;
      }
      const status = await window.api.invoke('request-server:status');
      console.log('[RequestQueue] Server status:', status);
      setServerStatus(status);
      
      // Load existing requests if server is running
      if (status.isRunning) {
        console.log('[RequestQueue] Server running, fetching existing requests...');
        const result = await window.api.invoke('request-server:getRequests');
        if (result.success && result.requests) {
          console.log('[RequestQueue] Loaded existing requests:', result.requests);
          setRequests(result.requests);
        }
      }
      
      if (status.url) {
        generateQRCode(status.url);
      }
    } catch (err) {
      console.warn('[RequestQueue] Failed to check server status:', err);
    }
  };

  const startServer = async () => {
    try {
      if (!window.api?.invoke) {
        alert('Request server requires Electron app. Please run: npm run electron');
        return;
      }
      const result = await window.api.invoke('request-server:start');
      if (result.success) {
        checkServerStatus();
      } else {
        alert('Failed to start server: ' + result.message);
      }
    } catch (err) {
      console.error('Failed to start server:', err);
      alert('Failed to start server: ' + err.message);
    }
  };

  const stopServer = async () => {
    try {
      if (!window.api?.invoke) {
        return;
      }
      await window.api.invoke('request-server:stop');
      checkServerStatus();
    } catch (err) {
      console.warn('Failed to stop server:', err);
    }
  };

  const generateQRCode = async (url) => {
    try {
      console.log('[RequestQueue] Generating QR code for URL:', url);
      const qrDataUrl = await QRCode.toDataURL(url, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      console.log('[RequestQueue] QR code generated successfully');
      setQrCodeUrl(qrDataUrl);
    } catch (err) {
      console.error('[RequestQueue] Failed to generate QR code:', err);
    }
  };

  const acceptRequest = async (request) => {
    try {
      if (!window.api?.invoke) {
        return;
      }
      await window.api.invoke('request-server:acceptRequest', request.id);
      setRequests(prev => prev.filter(r => r.id !== request.id));
      
      // Load track to deck
      if (onLoadTrack) {
        onLoadTrack(request.track);
      }
    } catch (err) {
      console.warn('Failed to accept request:', err);
    }
  };

  const rejectRequest = async (requestId) => {
    try {
      if (!window.api?.invoke) {
        return;
      }
      await window.api.invoke('request-server:rejectRequest', requestId);
      setRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (err) {
      console.warn('Failed to reject request:', err);
    }
  };

  const removeRequest = async (requestId) => {
    try {
      if (!window.api?.invoke) {
        return;
      }
      await window.api.invoke('request-server:removeRequest', requestId);
      setRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (err) {
      console.warn('Failed to remove request:', err);
    }
  };

  const clearAllRequests = async () => {
    if (!confirm('Clear all requests?')) return;
    
    try {
      if (!window.api?.invoke) {
        return;
      }
      await window.api.invoke('request-server:clearRequests');
      setRequests([]);
    } catch (err) {
      console.warn('Failed to clear requests:', err);
    }
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');

  return (
    <div className="request-queue-overlay" onClick={onClose}>
      <div className="request-queue-panel" onClick={(e) => e.stopPropagation()}>
        <div className="rq-header">
          <h2>🎵 Crowd Requests</h2>
          <button className="rq-close-btn" onClick={onClose}>×</button>
        </div>

        <div className="rq-content">
          {/* Server Status & Controls */}
          <div className="rq-section">
            <div className="rq-status-bar">
              <div className={`rq-status ${serverStatus.isRunning ? 'active' : 'inactive'}`}>
                <div className="status-dot"></div>
                <span>
                  {serverStatus.isRunning 
                    ? `Server Running - ${serverStatus.connections} connected`
                    : 'Server Stopped'}
                </span>
              </div>

              {!serverStatus.isRunning ? (
                <button className="rq-btn rq-btn-start" onClick={startServer}>
                  ▶️ Start Request Server
                </button>
              ) : (
                <button className="rq-btn rq-btn-stop" onClick={stopServer}>
                  ⏹️ Stop Server
                </button>
              )}
            </div>

            {serverStatus.isRunning && serverStatus.url && (
              <div className="rq-connection-info">
                <div className="rq-url-box">
                  <span className="rq-label">Guest URL:</span>
                  <input 
                    type="text" 
                    value={serverStatus.url} 
                    readOnly 
                    className="rq-url-input"
                    onClick={(e) => e.target.select()}
                  />
                  <button 
                    className="rq-copy-btn"
                    onClick={() => {
                      navigator.clipboard.writeText(serverStatus.url);
                      alert('URL copied to clipboard!');
                    }}
                  >
                    📋 Copy
                  </button>
                </div>

                <button 
                  className="rq-qr-btn"
                  onClick={() => setShowQR(!showQR)}
                >
                  {showQR ? '🔽 Hide QR Code' : '📱 Show QR Code'}
                </button>

                {showQR && qrCodeUrl && (
                  <div className="rq-qr-container">
                    <img src={qrCodeUrl} alt="QR Code" className="rq-qr-code" />
                    <p className="rq-qr-label">Scan to request songs!</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Request Queue */}
          <div className="rq-section">
            <div className="rq-queue-header">
              <h3>Request Queue ({pendingRequests.length})</h3>
              {pendingRequests.length > 0 && (
                <button className="rq-btn-clear" onClick={clearAllRequests}>
                  🗑️ Clear All
                </button>
              )}
            </div>

            <div className="rq-queue-list">
              {pendingRequests.length === 0 ? (
                <div className="rq-empty">
                  {serverStatus.isRunning 
                    ? '📭 No requests yet. Share the URL with your audience!'
                    : '🎧 Start the server to accept requests'}
                </div>
              ) : (
                pendingRequests.map(request => (
                  <div key={request.id} className="rq-item">
                    <div className="rq-item-info">
                      <div className="rq-track-title">{request.track.title}</div>
                      <div className="rq-track-artist">{request.track.artist || 'Unknown Artist'}</div>
                      <div className="rq-track-meta">
                        <span className="rq-requester">👤 {request.requester}</span>
                        <span className="rq-votes">
                          {request.votes > 0 && '🔥 '}
                          {request.votes} votes
                        </span>
                        <span className="rq-time">
                          {new Date(request.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>

                    <div className="rq-item-actions">
                      <button 
                        className="rq-action-btn rq-accept"
                        onClick={() => acceptRequest(request)}
                        title="Accept and load to deck"
                      >
                        ✅
                      </button>
                      <button 
                        className="rq-action-btn rq-reject"
                        onClick={() => rejectRequest(request.id)}
                        title="Reject request"
                      >
                        ❌
                      </button>
                      <button 
                        className="rq-action-btn rq-remove"
                        onClick={() => removeRequest(request.id)}
                        title="Remove from queue"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Instructions */}
          <div className="rq-section rq-instructions">
            <h3>💡 How It Works</h3>
            <ol>
              <li>Click <strong>"Start Request Server"</strong> to begin accepting requests</li>
              <li>Share the URL or show the QR code to your audience</li>
              <li>Guests visit the page on their phones to search and request songs</li>
              <li>They can vote on requests - most popular float to the top</li>
              <li>You see all requests here and can accept, reject, or ignore them</li>
              <li>Perfect for parties, weddings, clubs, and events!</li>
            </ol>

            <div className="rq-tips">
              <strong>🔥 Pro Tips:</strong>
              <ul>
                <li>Works on local WiFi - no internet needed!</li>
                <li>Print QR code poster for venues</li>
                <li>Guests can upvote their favorites</li>
                <li>You stay in full control - accept only what you want</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

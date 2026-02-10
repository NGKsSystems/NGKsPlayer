/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: RequestQueue.jsx
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
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
    requestCount: 0,
    pendingCount: 0
  });
  const [requests, setRequests] = useState([]);
  const [showQR, setShowQR] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [feedback, setFeedback] = useState([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showPaymentSettings, setShowPaymentSettings] = useState(false);
  const [paymentHandles, setPaymentHandles] = useState({
    venmo: '',
    cashapp: '',
    paypal: '',
    zelle: ''
  });
  const [requestPolicy, setRequestPolicy] = useState('free'); // 'free', 'paid', 'either'

  // Load payment handles and request policy on mount
  useEffect(() => {
    const loadSettings = async () => {
      const handlesResult = await window.api.invoke('request-server:getPaymentHandles');
      if (handlesResult.success && handlesResult.handles) {
        setPaymentHandles(handlesResult.handles);
      }
      
      const policyResult = await window.api.invoke('request-server:getRequestPolicy');
      if (policyResult.success && policyResult.policy) {
        setRequestPolicy(policyResult.policy);
      }
    };
    loadSettings();
  }, []);

  useEffect(() => {
    checkServerStatus();
    
    // Listen for new requests from server
    const handleNewRequest = (request) => {
      console.log('[RequestQueue] New request received:', request);
      setRequests(prev => {
        const updated = [...prev, request];
        console.log('[RequestQueue] Updated requests:', updated);
        
        // Update global pending count
        const pendingCount = updated.filter(r => r.status === 'pending').length;
        window.requestPendingCount = pendingCount;
        window.dispatchEvent(new Event('requestCountUpdated'));
        
        return updated;
      });
      console.log('[RequestQueue] Request added to queue');
    };

    // Listen for request updates (votes, status changes)
    const handleRequestUpdate = (updatedRequests) => {
      console.log('[RequestQueue] Requests updated:', updatedRequests);
      setRequests(updatedRequests);
      
      // Update global pending count for button badge
      const pendingCount = updatedRequests.filter(r => r.status === 'pending').length;
      window.requestPendingCount = pendingCount;
      
      // Force re-render of DJSimple to show badge
      window.dispatchEvent(new Event('requestCountUpdated'));
    };

    // Listen for feedback
    const handleNewFeedback = (feedbackItem) => {
      console.log('[RequestQueue] New feedback received:', feedbackItem);
      setFeedback(prev => [...prev, feedbackItem]);
    };

    if (window.electronAPI?.receive) {
      console.log('[RequestQueue] Setting up listeners');
      window.electronAPI.receive('request-server:newRequest', handleNewRequest);
      window.electronAPI.receive('request-server:requestsUpdated', handleRequestUpdate);
      window.electronAPI.receive('request-server:newFeedback', handleNewFeedback);
    } else {
      console.warn('[RequestQueue] electronAPI.receive not available');
    }

    return () => {
      if (window.electronAPI?.removeAllListeners) {
        window.electronAPI.removeAllListeners('request-server:newRequest');
        window.electronAPI.removeAllListeners('request-server:requestsUpdated');
        window.electronAPI.removeAllListeners('request-server:newFeedback');
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
          
          // Update global pending count
          const pendingCount = result.requests.filter(r => r.status === 'pending').length;
          window.requestPendingCount = pendingCount;
          window.dispatchEvent(new Event('requestCountUpdated'));
        }
      } else {
        window.requestPendingCount = 0;
        window.dispatchEvent(new Event('requestCountUpdated'));
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
      
      // Check if already running
      if (status.isRunning) {
        console.log('[RequestQueue] Server already running');
        return;
      }
      
      const result = await window.api.invoke('request-server:start');
      if (result.success) {
        console.log('[RequestQueue] Server started, URL:', result.url);
        // Generate QR code immediately
        if (result.url) {
          await generateQRCode(result.url);
        }
        // Then check full status
        checkServerStatus();
      } else {
        // If it fails because server is already running, just check status
        if (result.message && result.message.includes('already running')) {
          console.log('[RequestQueue] Server was already running, checking status');
          checkServerStatus();
        } else {
          alert('Failed to start server: ' + result.message);
        }
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
                  onClick={() => {
                    console.log('[RequestQueue] QR button clicked, current showQR:', showQR);
                    console.log('[RequestQueue] Current qrCodeUrl:', qrCodeUrl);
                    setShowQR(!showQR);
                  }}
                >
                  {showQR ? '🔽 Hide QR Code' : '📱 Show QR Code'}
                </button>

                {showQR && (
                  <div className="rq-qr-container">
                    {qrCodeUrl ? (
                      <>
                        <img src={qrCodeUrl} alt="QR Code" className="rq-qr-code" />
                        <p className="rq-qr-label">Scan to request songs!</p>
                      </>
                    ) : (
                      <p className="rq-qr-label">Generating QR code...</p>
                    )}
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

          {/* Settings Button */}
          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <button
              onClick={() => setShowPaymentSettings(!showPaymentSettings)}
              style={{
                padding: '10px 20px',
                background: 'rgba(255, 184, 0, 0.2)',
                border: '2px solid #ffb800',
                borderRadius: '8px',
                color: 'white',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              ⚙️ Payment & Request Settings
            </button>
          </div>

          {/* Payment & Request Settings Panel */}
          {showPaymentSettings && (
            <div style={{
              marginTop: '15px',
              padding: '20px',
              background: 'rgba(255, 184, 0, 0.1)',
              border: '2px solid #ffb800',
              borderRadius: '8px'
            }}>
              <h3 style={{ margin: '0 0 15px 0', fontSize: '16px' }}>💰 Payment & Request Settings</h3>
              
              {/* Request Policy Section */}
              <div style={{ marginBottom: '25px', padding: '15px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>Request Policy</h4>
                <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>
                  Choose how guests can request songs:
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', padding: '10px', background: requestPolicy === 'free' ? 'rgba(39, 174, 96, 0.2)' : 'rgba(255,255,255,0.05)', border: requestPolicy === 'free' ? '2px solid #27ae60' : '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="requestPolicy" 
                      value="free"
                      checked={requestPolicy === 'free'}
                      onChange={(e) => setRequestPolicy(e.target.value)}
                      style={{ marginRight: '10px' }}
                    />
                    <div>
                      <strong>Free Requests</strong>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>Anyone can request songs for free</div>
                    </div>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', padding: '10px', background: requestPolicy === 'paid' ? 'rgba(39, 174, 96, 0.2)' : 'rgba(255,255,255,0.05)', border: requestPolicy === 'paid' ? '2px solid #27ae60' : '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="requestPolicy" 
                      value="paid"
                      checked={requestPolicy === 'paid'}
                      onChange={(e) => setRequestPolicy(e.target.value)}
                      style={{ marginRight: '10px' }}
                    />
                    <div>
                      <strong>Paid Requests Only</strong>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>Guests must pay to request (not guaranteed to play)</div>
                    </div>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', padding: '10px', background: requestPolicy === 'either' ? 'rgba(39, 174, 96, 0.2)' : 'rgba(255,255,255,0.05)', border: requestPolicy === 'either' ? '2px solid #27ae60' : '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="requestPolicy" 
                      value="either"
                      checked={requestPolicy === 'either'}
                      onChange={(e) => setRequestPolicy(e.target.value)}
                      style={{ marginRight: '10px' }}
                    />
                    <div>
                      <strong>Free or Paid</strong>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>Accept both free and paid requests (payment not guaranteed)</div>
                    </div>
                  </label>
                </div>
              </div>
              
              <h4 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>Tip Payment Accounts</h4>
              <p style={{ margin: '0 0 15px 0', fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>
                Enter your payment handles below. Guests will see these when sending tips.
              </p>
              
              {/* Venmo */}
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '600' }}>
                  Venmo Handle (e.g., @YourUsername)
                </label>
                <input
                  type="text"
                  value={paymentHandles.venmo}
                  onChange={(e) => setPaymentHandles({...paymentHandles, venmo: e.target.value})}
                  placeholder="@YourVenmo"
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '4px',
                    color: 'white',
                    fontSize: '14px'
                  }}
                />
              </div>

              {/* Cash App */}
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '600' }}>
                  Cash App Handle (e.g., $YourUsername)
                </label>
                <input
                  type="text"
                  value={paymentHandles.cashapp}
                  onChange={(e) => setPaymentHandles({...paymentHandles, cashapp: e.target.value})}
                  placeholder="$YourCashApp"
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '4px',
                    color: 'white',
                    fontSize: '14px'
                  }}
                />
              </div>

              {/* PayPal */}
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '600' }}>
                  PayPal Email
                </label>
                <input
                  type="email"
                  value={paymentHandles.paypal}
                  onChange={(e) => setPaymentHandles({...paymentHandles, paypal: e.target.value})}
                  placeholder="your-email@example.com"
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '4px',
                    color: 'white',
                    fontSize: '14px'
                  }}
                />
              </div>

              {/* Zelle */}
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '600' }}>
                  Zelle Email or Phone
                </label>
                <input
                  type="text"
                  value={paymentHandles.zelle}
                  onChange={(e) => setPaymentHandles({...paymentHandles, zelle: e.target.value})}
                  placeholder="your-zelle@example.com or 555-1234"
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '4px',
                    color: 'white',
                    fontSize: '14px'
                  }}
                />
              </div>

              <button
                onClick={async () => {
                  const handlesResult = await window.api.invoke('request-server:setPaymentHandles', paymentHandles);
                  const policyResult = await window.api.invoke('request-server:setRequestPolicy', requestPolicy);
                  
                  if (handlesResult.success && policyResult.success) {
                    alert('✅ Settings saved successfully!');
                    setShowPaymentSettings(false);
                  } else {
                    alert('❌ Failed to save settings. Please try again.');
                  }
                }}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#27ae60',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                💾 Save Settings
              </button>
              <p style={{ margin: '10px 0 0 0', fontSize: '11px', color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>
                Leave payment fields blank to hide those options from guests
              </p>
            </div>
          )}

          {/* Feedback & Tips Section */}
          {serverStatus.isRunning && (
            <div className="rq-section">
              <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                <button 
                  onClick={() => setShowFeedback(!showFeedback)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: showFeedback ? '#f39c12' : 'rgba(243, 156, 18, 0.2)',
                    border: '2px solid #f39c12',
                    borderRadius: '8px',
                    color: 'white',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  💬 Feedback ({feedback.length})
                </button>
                <button 
                  onClick={async () => {
                    const result = await window.api.invoke('request-server:getTips');
                    if (result.success && result.tips.length > 0) {
                      const totalTips = result.tips.reduce((sum, tip) => sum + tip.amount, 0);
                      const tipDetails = result.tips.map(tip => 
                        `$${tip.amount} via ${tip.paymentMethod} from ${tip.name}${tip.message ? ` - "${tip.message}"` : ''}`
                      ).join('\n');
                      alert(`💰 Total Tips: $${totalTips}\n${result.tips.length} tip(s) received\n\n${tipDetails}`);
                    } else {
                      alert('No tips received yet');
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: 'rgba(39, 174, 96, 0.2)',
                    border: '2px solid #27ae60',
                    borderRadius: '8px',
                    color: 'white',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  💰 View Tips
                </button>
              </div>

              {showFeedback && feedback.length > 0 && (
                <div style={{ 
                  background: 'rgba(243, 156, 18, 0.1)', 
                  border: '2px solid rgba(243, 156, 18, 0.3)', 
                  borderRadius: '10px', 
                  padding: '15px',
                  maxHeight: '300px',
                  overflowY: 'auto'
                }}>
                  {feedback.map(item => (
                    <div key={item.id} style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      padding: '10px',
                      borderRadius: '8px',
                      marginBottom: '10px'
                    }}>
                      <div style={{ fontWeight: '600', marginBottom: '5px' }}>
                        {item.name} <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                          {new Date(item.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div style={{ color: 'rgba(255,255,255,0.8)' }}>{item.message}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

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
                <li><strong>💰 Configure Payment Settings:</strong> Click "Payment & Request Settings" to set up your Venmo, Cash App, PayPal, or Zelle accounts for tips</li>
                <li><strong>💵 Paid Requests:</strong> Choose your request policy (free, paid only, or both) - paid requests are NOT guaranteed to be played</li>
                <li><strong>💬 Guest Feedback:</strong> Guests can leave feedback about your performance - check the Feedback section above</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


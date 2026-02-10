/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: StreamingServices.jsx
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
import React, { useState, useEffect } from 'react';
import './StreamingServices.css';

const StreamingServices = ({ onClose }) => {
  const [services, setServices] = useState({});
  const [selectedService, setSelectedService] = useState(null);

  // Available streaming services
  const availableServices = [
    {
      id: 'spotify',
      name: 'Spotify',
      icon: '🎵',
      color: '#1DB954',
      description: 'Access millions of songs, playlists, and podcasts',
      authUrl: 'https://www.spotify.com/signup',
      requiresAuth: true,
      features: ['Browse tracks', 'Create playlists', 'Stream to decks']
    },
    {
      id: 'soundcloud',
      name: 'SoundCloud',
      icon: '☁️',
      color: '#FF5500',
      description: 'Discover emerging artists and underground tracks',
      authUrl: 'https://soundcloud.com/signup',
      requiresAuth: true,
      features: ['Browse tracks', 'Stream remixes', 'DJ-friendly content']
    },
    {
      id: 'tidal',
      name: 'Tidal',
      icon: '🌊',
      color: '#00FFFF',
      description: 'High-fidelity lossless audio streaming',
      authUrl: 'https://tidal.com/signup',
      requiresAuth: true,
      features: ['HiFi audio', 'Master quality', 'Exclusive content']
    },
    {
      id: 'beatport',
      name: 'Beatport',
      icon: '🎧',
      color: '#94D500',
      description: 'DJ-focused electronic music platform',
      authUrl: 'https://www.beatport.com/signup',
      requiresAuth: true,
      features: ['DJ charts', 'BPM/key info', 'Genre filters']
    },
    {
      id: 'apple-music',
      name: 'Apple Music',
      icon: '🍎',
      color: '#FA243C',
      description: 'Access your iTunes library and Apple Music catalog',
      authUrl: 'https://music.apple.com/subscribe',
      requiresAuth: true,
      features: ['iTunes sync', 'Apple Music catalog', 'Lossless audio']
    },
    {
      id: 'youtube-music',
      name: 'YouTube Music',
      icon: '▶️',
      color: '#FF0000',
      description: 'Music videos and audio from YouTube',
      authUrl: 'https://music.youtube.com',
      requiresAuth: true,
      features: ['Music videos', 'Remixes', 'Live performances']
    },
    {
      id: 'deezer',
      name: 'Deezer',
      icon: '🎼',
      color: '#FF9900',
      description: 'Global music streaming with smart recommendations',
      authUrl: 'https://www.deezer.com/signup',
      requiresAuth: true,
      features: ['Flow recommendations', 'HiFi audio', 'Global catalog']
    },
    {
      id: 'bandcamp',
      name: 'Bandcamp',
      icon: '🎸',
      color: '#629AA9',
      description: 'Support independent artists directly',
      authUrl: 'https://bandcamp.com/signup',
      requiresAuth: true,
      features: ['Buy tracks', 'Support artists', 'Download files']
    }
  ];

  useEffect(() => {
    loadServiceStatus();
  }, []);

  const loadServiceStatus = async () => {
    try {
      if (window.api?.invoke) {
        const result = await window.api.invoke('streaming-services:getStatus');
        if (result.success) {
          setServices(result.services || {});
        }
      }
    } catch (error) {
      console.error('Failed to load service status:', error);
    }
  };

  const handleConnect = async (service) => {
    setSelectedService(service);
  };

  const handleAuthSubmit = async (serviceId, credentials) => {
    try {
      if (window.api?.invoke) {
        const result = await window.api.invoke('streaming-services:connect', {
          serviceId,
          credentials
        });
        
        if (result.success) {
          alert(`✅ Connected to ${availableServices.find(s => s.id === serviceId).name}!`);
          loadServiceStatus();
          setSelectedService(null);
        } else {
          alert(`❌ Failed to connect: ${result.message}`);
        }
      }
    } catch (error) {
      console.error('Failed to connect:', error);
      alert(`❌ Connection error: ${error.message}`);
    }
  };

  const handleDisconnect = async (serviceId) => {
    if (!confirm('Disconnect from this service?')) return;
    
    try {
      if (window.api?.invoke) {
        await window.api.invoke('streaming-services:disconnect', serviceId);
        loadServiceStatus();
      }
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  };

  return (
    <div className="streaming-services-overlay">
      <div className="streaming-services-panel">
        <div className="streaming-services-header">
          <div>
            <h2>🌐 Streaming Music Services</h2>
            <p className="streaming-services-subtitle">
              Connect your streaming accounts to access millions of songs
            </p>
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="streaming-services-content">
          {/* Service Grid */}
          <div className="services-grid">
            {availableServices.map(service => {
              const isConnected = services[service.id]?.connected;
              
              return (
                <div 
                  key={service.id}
                  className={`service-card ${isConnected ? 'connected' : ''}`}
                  style={{ borderColor: service.color }}
                >
                  <div className="service-header">
                    <div className="service-icon" style={{ background: service.color }}>
                      {service.icon}
                    </div>
                    <div className="service-info">
                      <h3>{service.name}</h3>
                      <p>{service.description}</p>
                    </div>
                  </div>

                  <div className="service-features">
                    {service.features.map((feature, idx) => (
                      <span key={idx} className="feature-tag">✓ {feature}</span>
                    ))}
                  </div>

                  <div className="service-actions">
                    {isConnected ? (
                      <>
                        <div className="connected-badge">
                          ✅ Connected
                        </div>
                        <button 
                          className="btn-disconnect"
                          onClick={() => handleDisconnect(service.id)}
                        >
                          Disconnect
                        </button>
                      </>
                    ) : (
                      <>
                        <button 
                          className="btn-connect"
                          style={{ background: service.color }}
                          onClick={() => handleConnect(service)}
                        >
                          Connect {service.name}
                        </button>
                        <a 
                          href={service.authUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="signup-link"
                        >
                          Don't have an account? Sign up →
                        </a>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Auth Modal */}
          {selectedService && (
            <div className="auth-modal-overlay" onClick={() => setSelectedService(null)}>
              <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
                <h3>Connect to {selectedService.name}</h3>
                <p>Enter your credentials to connect your account</p>
                
                <div className="auth-instructions">
                  <h4>📋 Setup Instructions:</h4>
                  <ol>
                    <li>Sign up or log in to {selectedService.name} in your browser</li>
                    <li>Go to your account settings / developer section</li>
                    <li>Create an API key or developer token</li>
                    <li>Copy your credentials and paste them below</li>
                  </ol>
                  <p>
                    <strong>Note:</strong> You are responsible for your own account and any associated costs.
                    NGKs Player does not provide streaming service subscriptions.
                  </p>
                </div>

                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target);
                  handleAuthSubmit(selectedService.id, {
                    apiKey: formData.get('apiKey'),
                    apiSecret: formData.get('apiSecret'),
                    accessToken: formData.get('accessToken')
                  });
                }}>
                  <div className="form-group">
                    <label>API Key / Client ID</label>
                    <input 
                      type="text" 
                      name="apiKey"
                      placeholder="Enter your API key"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>API Secret / Client Secret (optional)</label>
                    <input 
                      type="password" 
                      name="apiSecret"
                      placeholder="Enter your API secret"
                    />
                  </div>

                  <div className="form-group">
                    <label>Access Token (optional)</label>
                    <input 
                      type="text" 
                      name="accessToken"
                      placeholder="Enter your access token"
                    />
                  </div>

                  <div className="modal-actions">
                    <button type="button" onClick={() => setSelectedService(null)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn-primary">
                      Connect
                    </button>
                  </div>
                </form>

                <div className="help-links">
                  <a href={selectedService.authUrl} target="_blank" rel="noopener noreferrer">
                    → Get API credentials
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Info Section */}
          <div className="services-info">
            <h3>💡 How It Works</h3>
            <ul>
              <li><strong>Free to connect:</strong> NGKs Player is free. You need your own streaming service account.</li>
              <li><strong>Your accounts:</strong> Set up and pay for subscriptions directly with each service.</li>
              <li><strong>DJ access:</strong> Once connected, browse and stream tracks directly to your decks.</li>
              <li><strong>Your data:</strong> All credentials are stored locally and never sent to us.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StreamingServices;


/**
 * NGKs Player - Streaming Service Setup & Authentication
 * 
 * Complete setup wizard for all streaming services, matching Serato DJ Pro's approach
 * but with superior integration and more services
 */

import React, { useState, useEffect } from 'react';
import { Check, X, ExternalLink, Key, Shield, Zap, AlertCircle, 
         RefreshCw, Settings, Music, Headphones, Globe, Star } from 'lucide-react';

const StreamingSetup = ({ streamingController, onComplete }) => {
  const [setupStage, setSetupStage] = useState('overview'); // 'overview', 'service', 'testing', 'complete'
  const [selectedService, setSelectedService] = useState(null);
  const [authStatus, setAuthStatus] = useState({});
  const [testResults, setTestResults] = useState({});
  const [isConnecting, setIsConnecting] = useState(false);

  // Service configurations with detailed setup info
  const services = {
    soundcloud: {
      name: 'SoundCloud',
      icon: '🟠',
      color: '#ff5500',
      description: 'Access 320M+ tracks including underground and independent artists',
      features: ['Full streaming', 'DJ-friendly tracks', 'Playlists', 'Likes sync', 'Upload integration'],
      setup_difficulty: 'Easy',
      streaming_quality: 'High (320kbps)',
      dj_focus: 9,
      catalog_size: '320M+',
      cost: 'Free tier available',
      setup_steps: [
        'Visit SoundCloud Developer Portal',
        'Create new application',
        'Copy Client ID',
        'Paste into NGKs Player'
      ],
      setup_url: 'https://developers.soundcloud.com/',
      auth_type: 'OAuth 2.0'
    },
    spotify: {
      name: 'Spotify',
      icon: '🟢',
      color: '#1ed760',
      description: '100M+ tracks with AI-powered recommendations and audio analysis',
      features: ['Track metadata', 'Audio features', 'Playlists', 'Recommendations', 'Artist info'],
      setup_difficulty: 'Medium',
      streaming_quality: 'High (320kbps OGG)',
      dj_focus: 7,
      catalog_size: '100M+',
      cost: 'Premium required',
      setup_steps: [
        'Go to Spotify for Developers',
        'Create new app',
        'Add NGKs Player redirect URI',
        'Copy Client ID & Secret'
      ],
      setup_url: 'https://developer.spotify.com/dashboard/',
      auth_type: 'OAuth 2.0 with PKCE'
    },
    apple_music: {
      name: 'Apple Music',
      icon: '🔴',
      color: '#fa243c',
      description: '100M+ tracks with spatial audio and lossless quality',
      features: ['Lossless streaming', 'Spatial Audio', 'Playlists', 'Artist Connect', 'Music Videos'],
      setup_difficulty: 'Hard',
      streaming_quality: 'Lossless (up to 24-bit/192kHz)',
      dj_focus: 6,
      catalog_size: '100M+',
      cost: 'Subscription required',
      setup_steps: [
        'Join Apple Developer Program ($99/year)',
        'Create MusicKit identifier',
        'Generate private key',
        'Configure team ID and key ID'
      ],
      setup_url: 'https://developer.apple.com/musickit/',
      auth_type: 'MusicKit JS with JWT'
    },
    tidal: {
      name: 'Tidal',
      icon: '🔵',
      color: '#000000',
      description: '80M+ tracks with Master Quality and exclusive content',
      features: ['Master Quality (MQA)', 'Hi-Fi streaming', 'Exclusive releases', 'Music videos', 'Editorial content'],
      setup_difficulty: 'Medium',
      streaming_quality: 'Master (MQA up to 24-bit/352.8kHz)',
      dj_focus: 8,
      catalog_size: '80M+',
      cost: 'Hi-Fi subscription required',
      setup_steps: [
        'Apply for Tidal Developer Access',
        'Get API credentials approved',
        'Implement OAuth flow',
        'Configure quality preferences'
      ],
      setup_url: 'https://developer.tidal.com/',
      auth_type: 'OAuth 2.0'
    },
    beatport: {
      name: 'Beatport',
      icon: '🟡',
      color: '#01ff01',
      description: '15M+ electronic music tracks, the world\'s largest DJ store',
      features: ['DJ-focused catalog', 'Extended previews', 'Genre charts', 'Professional quality', 'Remix packs'],
      setup_difficulty: 'Easy',
      streaming_quality: 'Professional (320kbps MP3 + WAV)',
      dj_focus: 10,
      catalog_size: '15M+',
      cost: 'Streaming subscription',
      setup_steps: [
        'Contact Beatport for API access',
        'Provide DJ credentials',
        'Receive API key',
        'Configure streaming settings'
      ],
      setup_url: 'https://www.beatport.com/api',
      auth_type: 'API Key + OAuth'
    },
    beatsource: {
      name: 'Beatsource',
      icon: '🟣',
      color: '#6441a4',
      description: '12M+ open format tracks including hip-hop, Latin, and clean edits',
      features: ['Open format focus', 'Clean versions', 'DJ edits', 'Hip-hop & Latin', 'Intro/outro edits'],
      setup_difficulty: 'Easy',
      streaming_quality: 'Professional (320kbps MP3)',
      dj_focus: 10,
      catalog_size: '12M+',
      cost: 'DJ subscription',
      setup_steps: [
        'Sign up for Beatsource DJ plan',
        'Request API access',
        'Verify DJ credentials',
        'Integrate with NGKs Player'
      ],
      setup_url: 'https://www.beatsource.com/',
      auth_type: 'OAuth 2.0'
    }
  };

  // Check authentication status on mount
  useEffect(() => {
    if (streamingController) {
      checkAllAuthStatus();
    }
  }, [streamingController]);

  const checkAllAuthStatus = async () => {
    const status = {};
    for (const serviceId of Object.keys(services)) {
      try {
        status[serviceId] = await streamingController.isAuthenticated(serviceId);
      } catch (error) {
        status[serviceId] = false;
      }
    }
    setAuthStatus(status);
  };

  const handleServiceAuth = async (serviceId) => {
    setIsConnecting(true);
    try {
      const success = await streamingController.authenticate(serviceId);
      setAuthStatus(prev => ({ ...prev, [serviceId]: success }));
      
      if (success) {
        // Test the connection
        const testResult = await streamingController.testConnection(serviceId);
        setTestResults(prev => ({ ...prev, [serviceId]: testResult }));
      }
    } catch (error) {
      console.error(`Authentication failed for ${serviceId}:`, error);
      setAuthStatus(prev => ({ ...prev, [serviceId]: false }));
    } finally {
      setIsConnecting(false);
    }
  };

  const getDJFocusStars = (score) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star 
        key={i} 
        className={`w-4 h-4 ${i < Math.floor(score / 2) ? 'text-yellow-500 fill-current' : 'text-gray-400'}`} 
      />
    ));
  };

  const getSetupDifficultyColor = (difficulty) => {
    const colors = {
      'Easy': 'text-green-500',
      'Medium': 'text-yellow-500',
      'Hard': 'text-red-500'
    };
    return colors[difficulty] || 'text-gray-400';
  };

  const authenticatedCount = Object.values(authStatus).filter(Boolean).length;
  const totalServices = Object.keys(services).length;

  // Overview Stage
  if (setupStage === 'overview') {
    return (
      <div className="streaming-setup max-w-6xl mx-auto p-6">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Globe className="w-8 h-8 text-blue-500" />
            <h1 className="text-3xl font-bold">Access Millions of Tracks</h1>
          </div>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Connect NGKs Player to major streaming platforms and access more music than any other DJ software. 
            Set up once, mix forever.
          </p>
        </div>

        {/* Progress Overview */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Setup Progress</h2>
            <span className="text-lg font-bold text-blue-500">
              {authenticatedCount}/{totalServices} Services Connected
            </span>
          </div>
          
          <div className="w-full bg-gray-700 rounded-full h-3 mb-4">
            <div 
              className="bg-blue-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${(authenticatedCount / totalServices) * 100}%` }}
            />
          </div>

          <div className="grid grid-cols-3 gap-4 text-center text-sm">
            <div>
              <div className="text-2xl font-bold text-green-500">{authenticatedCount}</div>
              <div className="text-gray-400">Connected</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-500">
                {Object.values(services).reduce((sum, s) => sum + parseInt(s.catalog_size.replace(/[^0-9]/g, '')), 0)}M+
              </div>
              <div className="text-gray-400">Total Tracks</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-500">
                {Object.values(services).filter(s => s.dj_focus >= 8).length}
              </div>
              <div className="text-gray-400">DJ-Focused</div>
            </div>
          </div>
        </div>

        {/* Service Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {Object.entries(services).map(([serviceId, service]) => {
            const isConnected = authStatus[serviceId];
            const testResult = testResults[serviceId];
            
            return (
              <div
                key={serviceId}
                className={`bg-gray-800 rounded-lg p-6 border-2 transition-all hover:shadow-lg ${
                  isConnected ? 'border-green-500' : 'border-gray-600 hover:border-gray-500'
                }`}
              >
                {/* Service Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{service.icon}</span>
                    <div>
                      <h3 className="font-semibold">{service.name}</h3>
                      <div className="flex items-center gap-1">
                        {getDJFocusStars(service.dj_focus)}
                      </div>
                    </div>
                  </div>
                  
                  {isConnected ? (
                    <div className="flex items-center gap-2 text-green-500">
                      <Check className="w-5 h-5" />
                      <span className="text-sm font-medium">Connected</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-gray-400">
                      <X className="w-5 h-5" />
                      <span className="text-sm">Not Connected</span>
                    </div>
                  )}
                </div>

                {/* Service Stats */}
                <div className="space-y-2 mb-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Catalog:</span>
                    <span className="font-medium">{service.catalog_size}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Quality:</span>
                    <span className="font-medium">{service.streaming_quality}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Setup:</span>
                    <span className={`font-medium ${getSetupDifficultyColor(service.setup_difficulty)}`}>
                      {service.setup_difficulty}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Cost:</span>
                    <span className="font-medium">{service.cost}</span>
                  </div>
                </div>

                {/* Description */}
                <p className="text-gray-400 text-sm mb-4">{service.description}</p>

                {/* Features */}
                <div className="mb-4">
                  <div className="flex flex-wrap gap-1">
                    {service.features.slice(0, 3).map(feature => (
                      <span key={feature} className="px-2 py-1 bg-gray-700 rounded text-xs">
                        {feature}
                      </span>
                    ))}
                    {service.features.length > 3 && (
                      <span className="px-2 py-1 bg-gray-600 rounded text-xs">
                        +{service.features.length - 3} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Button */}
                <button
                  onClick={() => {
                    setSelectedService(serviceId);
                    setSetupStage('service');
                  }}
                  disabled={isConnecting}
                  className={`w-full py-2 px-4 rounded-lg font-medium transition-all ${
                    isConnected
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  } ${isConnecting ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isConnecting ? (
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Connecting...
                    </div>
                  ) : isConnected ? (
                    'Manage Connection'
                  ) : (
                    'Connect Service'
                  )}
                </button>

                {/* Test Result */}
                {testResult && (
                  <div className={`mt-2 p-2 rounded text-xs ${
                    testResult.success ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'
                  }`}>
                    {testResult.success ? '✅ Connection verified' : `❌ ${testResult.error}`}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4">
          <button
            onClick={() => checkAllAuthStatus()}
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium"
          >
            <RefreshCw className="w-4 h-4 inline mr-2" />
            Refresh Status
          </button>
          
          {authenticatedCount > 0 && (
            <button
              onClick={() => onComplete && onComplete()}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium"
            >
              Continue with {authenticatedCount} Service{authenticatedCount !== 1 ? 's' : ''}
            </button>
          )}
        </div>

        {/* Pro Tips */}
        <div className="mt-8 bg-blue-900 bg-opacity-50 rounded-lg p-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-400" />
            Pro Tips for Maximum Music Access
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
            <div>
              <strong>For DJs:</strong> Start with Beatport + Beatsource for the most DJ-friendly catalog
            </div>
            <div>
              <strong>For Quality:</strong> Tidal + Apple Music offer the highest audio quality
            </div>
            <div>
              <strong>For Discovery:</strong> SoundCloud has the most underground and independent tracks
            </div>
            <div>
              <strong>For Mainstream:</strong> Spotify has the best recommendations and playlists
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Individual Service Setup Stage
  if (setupStage === 'service' && selectedService) {
    const service = services[selectedService];
    const isConnected = authStatus[selectedService];

    return (
      <div className="streaming-setup max-w-4xl mx-auto p-6">
        {/* Back Button */}
        <button
          onClick={() => setSetupStage('overview')}
          className="mb-6 text-blue-400 hover:text-blue-300 flex items-center gap-2"
        >
          ← Back to Overview
        </button>

        {/* Service Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="text-4xl">{service.icon}</span>
            <h1 className="text-3xl font-bold">{service.name} Setup</h1>
          </div>
          <p className="text-gray-400 max-w-2xl mx-auto">{service.description}</p>
        </div>

        {/* Setup Steps */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Setup Instructions</h2>
          <div className="space-y-4">
            {service.setup_steps.map((step, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                  {index + 1}
                </div>
                <p className="text-gray-300">{step}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-gray-700 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <ExternalLink className="w-4 h-4" />
              <strong>Developer Portal:</strong>
            </div>
            <a 
              href={service.setup_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline"
            >
              {service.setup_url}
            </a>
          </div>
        </div>

        {/* Connection Status */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Connection Status</h2>
          
          {isConnected ? (
            <div className="flex items-center gap-3 p-4 bg-green-900 bg-opacity-50 rounded-lg">
              <Check className="w-6 h-6 text-green-500" />
              <div>
                <div className="font-medium text-green-400">Successfully Connected!</div>
                <div className="text-green-300 text-sm">
                  {service.name} is ready to use in NGKs Player
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-4 bg-yellow-900 bg-opacity-50 rounded-lg">
              <AlertCircle className="w-6 h-6 text-yellow-500" />
              <div>
                <div className="font-medium text-yellow-400">Not Connected</div>
                <div className="text-yellow-300 text-sm">
                  Follow the setup instructions above to connect {service.name}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4">
          <button
            onClick={() => handleServiceAuth(selectedService)}
            disabled={isConnecting}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium disabled:opacity-50"
          >
            {isConnecting ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Connecting...
              </div>
            ) : isConnected ? (
              'Reconnect Service'
            ) : (
              'Connect Now'
            )}
          </button>

          {isConnected && (
            <button
              onClick={() => setSetupStage('testing')}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-medium"
            >
              Test Connection
            </button>
          )}
        </div>
      </div>
    );
  }

  return null;
};

export default StreamingSetup;
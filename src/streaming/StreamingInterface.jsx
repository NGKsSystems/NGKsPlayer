/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: StreamingInterface.jsx
 * Purpose: TODO â€“ describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
/**
 * NGKs Player - Revolutionary Streaming Interface
 * 
 * The streaming interface that makes other DJ software look ancient:
 * - Multi-service search with real-time results
 * - DJ-optimized track recommendations
 * - One-click streaming to decks
 * - Automatic BPM/key analysis
 * - Smart caching and offline mode
 */

import React, { useState, useEffect, useRef } from 'react';
import { StreamingController } from './StreamingController.js';

const StreamingInterface = ({ onTrackSelect, currentTrack }) => {
  const [streamingController, setStreamingController] = useState(null);
  const [services, setServices] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedService, setSelectedService] = useState('all');
  const [recommendations, setRecommendations] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [stats, setStats] = useState({});
  
  const searchInputRef = useRef(null);

  // Initialize streaming controller
  useEffect(() => {
    const initializeStreaming = async () => {
      try {
        const controller = new StreamingController({
          enabledServices: ['soundcloud', 'spotify', 'tidal', 'beatport'],
          autoAnalyze: true,
          highQuality: true
        });

        // Set up event listeners
        controller.on('initialized', (data) => {
          console.log('ðŸŽµ Streaming services initialized:', data.services);
          updateStatus();
        });

        controller.on('authenticated', (data) => {
          console.log(`âœ… Connected to ${data.service}`);
          updateStatus();
        });

        controller.on('searchComplete', (data) => {
          console.log(`ðŸ” Search completed: ${data.resultCount} results`);
        });

        setStreamingController(controller);
        await controller.initializeServices();
        
      } catch (error) {
        console.error('âŒ Streaming initialization failed:', error);
      }
    };

    initializeStreaming();

    return () => {
      if (streamingController) {
        // Cleanup if needed
      }
    };
  }, []);

  // Update status periodically
  const updateStatus = () => {
    if (streamingController) {
      const status = streamingController.getStatus();
      setServices(status.services);
      setStats(status.stats);
    }
  };

  // Search functionality
  const handleSearch = async () => {
    if (!searchQuery.trim() || !streamingController) return;
    
    setIsSearching(true);
    
    try {
      const results = await streamingController.search(searchQuery, {
        limit: 50,
        services: selectedService === 'all' ? undefined : [selectedService]
      });
      
      setSearchResults(results);
      
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle Enter key in search
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Load track to deck
  const handleLoadTrack = async (track, deck = 'A') => {
    try {
      if (onTrackSelect) {
        // Get streaming URL
        const streamUrl = await streamingController.getStreamUrl(track);
        
        // Create track object for NGKs Player
        const ngksTrack = {
          id: `${track._service}_${track.id}`,
          title: track.title || track.name,
          artist: track.artist || track.user?.username || 'Unknown',
          duration: track.duration || track.duration_ms,
          bpm: track.djFeatures?.bpm || 128,
          key: track.djFeatures?.key || 'Unknown',
          streamUrl: streamUrl,
          service: track._service,
          serviceIcon: track._serviceIcon,
          artwork: track.artwork_url || track.album?.images?.[0]?.url,
          djSuitability: track.djFeatures?.djSuitability || 0.5
        };
        
        onTrackSelect(ngksTrack, deck);
        console.log(`ðŸŽµ Loaded ${ngksTrack.title} to Deck ${deck}`);
      }
    } catch (error) {
      console.error('Failed to load track:', error);
      alert('Failed to load track. Please try again.');
    }
  };

  // Get recommendations
  const getRecommendations = async () => {
    if (!currentTrack || !streamingController) return;
    
    try {
      // This would use the current track to get similar tracks
      const results = await streamingController.search(
        `${currentTrack.artist} ${currentTrack.genre || 'electronic'}`,
        { limit: 10 }
      );
      
      setRecommendations(results.combined.slice(0, 10));
      
    } catch (error) {
      console.error('Failed to get recommendations:', error);
    }
  };

  // Service authentication
  const handleAuthenticate = (serviceId) => {
    // This would open OAuth flow
    alert(`Authentication for ${services[serviceId]?.name} would open here`);
  };

  return (
    <div className="streaming-interface p-6 bg-gray-900 text-white rounded-lg">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">ðŸŽµ NGKs Streaming Hub</h2>
        <div className="text-sm text-gray-400">
          {stats.servicesConnected || 0} services connected
        </div>
      </div>

      {/* Service Status */}
      <div className="grid grid-cols-5 gap-2 mb-6">
        {Object.entries(services).map(([serviceId, service]) => (
          <div 
            key={serviceId}
            className={`p-2 rounded text-center text-xs ${
              service.authenticated 
                ? 'bg-green-800 text-green-200' 
                : 'bg-gray-800 text-gray-400 cursor-pointer hover:bg-gray-700'
            }`}
            onClick={() => !service.authenticated && handleAuthenticate(serviceId)}
          >
            <div className="font-semibold">{service.name}</div>
            <div className="text-xs">
              {service.authenticated ? 'âœ… Connected' : 'ðŸ”Œ Connect'}
            </div>
          </div>
        ))}
      </div>

      {/* Search Interface */}
      <div className="mb-6">
        <div className="flex gap-2 mb-2">
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Search millions of tracks..."
            className="flex-1 p-3 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-400"
          />
          
          <select
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value)}
            className="p-3 bg-gray-800 border border-gray-700 rounded text-white"
          >
            <option value="all">All Services</option>
            {Object.entries(services).map(([serviceId, service]) => (
              <option key={serviceId} value={serviceId} disabled={!service.authenticated}>
                {service.name} {!service.authenticated && '(Not Connected)'}
              </option>
            ))}
          </select>
          
          <button
            onClick={handleSearch}
            disabled={isSearching || !searchQuery.trim()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded font-semibold"
          >
            {isSearching ? 'ðŸ”' : 'Search'}
          </button>
        </div>
        
        <div className="text-xs text-gray-400">
          Use keywords like: "house 128 bpm", "techno remix", "vocal deep house"
        </div>
      </div>

      {/* Search Results */}
      {searchResults && (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold">
              Search Results ({searchResults.combined.length})
            </h3>
            <div className="text-sm text-gray-400">
              Sorted by DJ suitability
            </div>
          </div>
          
          <div className="max-h-96 overflow-y-auto bg-gray-800 rounded">
            {searchResults.combined.map((track, index) => (
              <div 
                key={`${track._service}_${track.id}_${index}`}
                className="flex items-center p-3 border-b border-gray-700 hover:bg-gray-700 cursor-pointer"
              >
                {/* Service Icon */}
                <div className="w-8 text-center text-lg">
                  {track._serviceIcon}
                </div>
                
                {/* Track Info */}
                <div className="flex-1 ml-3">
                  <div className="font-semibold truncate">
                    {track.title || track.name || 'Unknown Title'}
                  </div>
                  <div className="text-sm text-gray-400 truncate">
                    {track.artist || track.user?.username || 'Unknown Artist'}
                  </div>
                  <div className="text-xs text-gray-500 flex gap-4">
                    {track.djFeatures && (
                      <>
                        {track.djFeatures.bpm && (
                          <span>BPM: {Math.round(track.djFeatures.bpm)}</span>
                        )}
                        {track.djFeatures.key && (
                          <span>Key: {track.djFeatures.key}</span>
                        )}
                        <span>
                          DJ Score: {Math.round((track.djFeatures.djSuitability || 0.5) * 100)}%
                        </span>
                      </>
                    )}
                  </div>
                </div>
                
                {/* Duration */}
                <div className="text-sm text-gray-400 w-16 text-right">
                  {track.duration ? 
                    `${Math.floor(track.duration / 60000)}:${String(Math.floor((track.duration % 60000) / 1000)).padStart(2, '0')}` :
                    '---'
                  }
                </div>
                
                {/* Load Buttons */}
                <div className="ml-4 flex gap-1">
                  <button
                    onClick={() => handleLoadTrack(track, 'A')}
                    className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-xs"
                    title="Load to Deck A"
                  >
                    A
                  </button>
                  <button
                    onClick={() => handleLoadTrack(track, 'B')}
                    className="px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs"
                    title="Load to Deck B"
                  >
                    B
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <button
          onClick={getRecommendations}
          disabled={!currentTrack}
          className="p-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded"
        >
          ðŸŽ¯ Get Similar Tracks
        </button>
        
        <button
          onClick={() => setSearchQuery('house 128 bpm')}
          className="p-3 bg-green-600 hover:bg-green-700 rounded"
        >
          ðŸ  House Music
        </button>
        
        <button
          onClick={() => setSearchQuery('techno 130 bpm')}
          className="p-3 bg-orange-600 hover:bg-orange-700 rounded"
        >
          ðŸ”¥ Techno
        </button>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-3">ðŸŽ¯ Recommended Tracks</h3>
          <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
            {recommendations.map((track, index) => (
              <div 
                key={`rec_${track._service}_${track.id}_${index}`}
                className="flex items-center p-2 bg-gray-800 rounded hover:bg-gray-700 cursor-pointer"
                onClick={() => handleLoadTrack(track)}
              >
                <span className="mr-2">{track._serviceIcon}</span>
                <div className="flex-1">
                  <div className="text-sm font-semibold truncate">
                    {track.title || track.name}
                  </div>
                  <div className="text-xs text-gray-400 truncate">
                    {track.artist || track.user?.username}
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  {track.djFeatures?.bpm && `${Math.round(track.djFeatures.bpm)} BPM`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Statistics */}
      <div className="text-xs text-gray-500 grid grid-cols-4 gap-4">
        <div>Tracks Streamed: {stats.tracksStreamed || 0}</div>
        <div>Cache Hits: {stats.cacheHits || 0}</div>
        <div>Cache Misses: {stats.cacheMisses || 0}</div>
        <div>Downloaded: {Math.round((stats.totalDownloaded || 0) / 1024 / 1024)}MB</div>
      </div>
    </div>
  );
};

export default StreamingInterface;

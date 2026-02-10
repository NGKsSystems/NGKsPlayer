/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: StreamingBrowser.jsx
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
/**
 * NGKs Player - Streaming Browser
 * 
 * Complete streaming integration interface matching and exceeding Serato DJ Pro
 * Access millions of tracks from all major streaming platforms in one unified interface
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Play, Pause, Download, Heart, Star, Filter, Grid, List, 
         Wifi, WifiOff, Music, Headphones, Volume2, Clock, Users, 
         ChevronDown, ChevronUp, RefreshCw, Settings, Zap } from 'lucide-react';

const StreamingBrowser = ({ 
  streamingController, 
  onTrackSelect, 
  onTrackLoad, 
  currentTrack = null,
  isPlaying = false 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedServices, setSelectedServices] = useState([]);
  const [availableServices, setAvailableServices] = useState([]);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [filters, setFilters] = useState({
    djFriendlyOnly: false,
    qualityFilter: 'any',
    genre: null,
    bpmRange: null,
    explicit: null
  });
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('relevance'); // 'relevance', 'dj_score', 'quality', 'duration'
  const [previewTrack, setPreviewTrack] = useState(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [favorites, setFavorites] = useState(new Set());
  
  const searchTimeout = useRef(null);
  const previewAudio = useRef(null);

  // Service configurations (matching Serato's layout)
  const serviceConfig = {
    soundcloud: { name: 'SoundCloud', icon: '🟠', color: '#ff5500' },
    spotify: { name: 'Spotify', icon: '🟢', color: '#1ed760' },
    apple_music: { name: 'Apple Music', icon: '🔴', color: '#fa243c' },
    tidal: { name: 'Tidal', icon: '🔵', color: '#000000' },
    beatport: { name: 'Beatport', icon: '🟡', color: '#01ff01' },
    beatsource: { name: 'Beatsource', icon: '🟣', color: '#6441a4' },
    youtube_music: { name: 'YouTube Music', icon: '🔴', color: '#ff0000' },
    bandcamp: { name: 'Bandcamp', icon: '🎵', color: '#408294' },
    mixcloud: { name: 'Mixcloud', icon: '🎧', color: '#314359' },
    deezer: { name: 'Deezer', icon: '🟠', color: '#feaa2d' }
  };

  // Initialize available services
  useEffect(() => {
    if (streamingController) {
      const services = streamingController.getAuthenticatedServices();
      setAvailableServices(services);
      setSelectedServices(services); // Select all by default
    }
  }, [streamingController]);

  // Debounced search
  const performSearch = useCallback(async (query, searchFilters = filters) => {
    if (!query.trim() || !streamingController) return;

    setIsSearching(true);
    
    try {
      console.log('🔍 Searching for:', query);
      const results = await streamingController.search(query, {
        services: selectedServices,
        limit: 100,
        ...searchFilters
      });

      setSearchResults(results.combined || []);
      console.log(`✅ Found ${results.combined?.length || 0} tracks`);
      
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [streamingController, selectedServices, filters]);

  // Handle search input with debouncing
  useEffect(() => {
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    if (searchQuery) {
      searchTimeout.current = setTimeout(() => {
        performSearch(searchQuery);
      }, 500);
    } else {
      setSearchResults([]);
    }

    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, [searchQuery, performSearch]);

  // Handle preview playback
  const handlePreviewPlay = (track) => {
    if (previewTrack?.id === track.id && isPreviewPlaying) {
      // Stop current preview
      if (previewAudio.current) {
        previewAudio.current.pause();
      }
      setIsPreviewPlaying(false);
      setPreviewTrack(null);
    } else {
      // Play new preview
      if (previewAudio.current) {
        previewAudio.current.pause();
      }
      
      if (track.preview_url) {
        previewAudio.current = new Audio(track.preview_url);
        previewAudio.current.volume = 0.5;
        previewAudio.current.play();
        previewAudio.current.onended = () => {
          setIsPreviewPlaying(false);
          setPreviewTrack(null);
        };
        
        setPreviewTrack(track);
        setIsPreviewPlaying(true);
      }
    }
  };

  // Toggle service selection
  const toggleService = (serviceId) => {
    setSelectedServices(prev => 
      prev.includes(serviceId) 
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  // Format duration
  const formatDuration = (ms) => {
    if (!ms) return '--:--';
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Get quality badge color
  const getQualityColor = (quality) => {
    const colors = {
      'master': 'bg-purple-500',
      'lossless': 'bg-blue-500',
      'professional': 'bg-green-500',
      'high': 'bg-yellow-500',
      'standard': 'bg-gray-500',
      'variable': 'bg-red-500'
    };
    return colors[quality] || 'bg-gray-400';
  };

  // Sort results
  const sortedResults = [...searchResults].sort((a, b) => {
    switch (sortBy) {
      case 'dj_score':
        return (b.dj_score || 0) - (a.dj_score || 0);
      case 'quality':
        const qualityRank = { 'master': 4, 'lossless': 3, 'high': 2, 'standard': 1, 'variable': 0 };
        return (qualityRank[b.quality] || 0) - (qualityRank[a.quality] || 0);
      case 'duration':
        return (b.duration_ms || 0) - (a.duration_ms || 0);
      case 'relevance':
      default:
        return (b.popularity || 0) - (a.popularity || 0);
    }
  });

  return (
    <div className="streaming-browser h-full flex flex-col bg-gray-900 text-white">
      {/* Header with service selection */}
      <div className="flex-shrink-0 p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Wifi className="w-5 h-5" />
            Stream Millions of Tracks
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="p-2 hover:bg-gray-700 rounded"
            >
              {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded ${showFilters ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
            >
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Service Selection (Serato-style) */}
        <div className="flex flex-wrap gap-2 mb-4">
          {availableServices.map(serviceId => {
            const config = serviceConfig[serviceId];
            const isSelected = selectedServices.includes(serviceId);
            
            return (
              <button
                key={serviceId}
                onClick={() => toggleService(serviceId)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  isSelected 
                    ? 'bg-blue-600 text-white shadow-lg' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
                style={isSelected ? { backgroundColor: config.color } : {}}
              >
                <span className="text-lg">{config.icon}</span>
                {config.name}
                {isSelected && <Zap className="w-3 h-3" />}
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search millions of tracks across all platforms..."
            className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
          />
          {isSearching && (
            <RefreshCw className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-blue-500 animate-spin" />
          )}
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-800 rounded-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Sort By</label>
                <select 
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                >
                  <option value="relevance">Relevance</option>
                  <option value="dj_score">DJ Score</option>
                  <option value="quality">Quality</option>
                  <option value="duration">Duration</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Quality</label>
                <select 
                  value={filters.qualityFilter}
                  onChange={(e) => setFilters({...filters, qualityFilter: e.target.value})}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                >
                  <option value="any">Any Quality</option>
                  <option value="master">Master Quality</option>
                  <option value="lossless">Lossless</option>
                  <option value="high">High (320kbps+)</option>
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="djFriendly"
                  checked={filters.djFriendlyOnly}
                  onChange={(e) => setFilters({...filters, djFriendlyOnly: e.target.checked})}
                  className="mr-2"
                />
                <label htmlFor="djFriendly" className="text-sm">DJ-Friendly Only</label>
              </div>

              <div className="flex items-center justify-end">
                <button
                  onClick={() => performSearch(searchQuery)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-auto p-4">
        {searchResults.length === 0 && !isSearching && searchQuery && (
          <div className="text-center py-12 text-gray-400">
            <Music className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No tracks found for "{searchQuery}"</p>
            <p className="text-sm mt-2">Try adjusting your search terms or filters</p>
          </div>
        )}

        {searchResults.length === 0 && !searchQuery && (
          <div className="text-center py-12 text-gray-400">
            <Headphones className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-semibold mb-2">Access Millions of Tracks</h3>
            <p>Search across all major streaming platforms:</p>
            <div className="flex justify-center gap-2 mt-4 text-2xl">
              {Object.values(serviceConfig).map(config => (
                <span key={config.name} title={config.name}>{config.icon}</span>
              ))}
            </div>
          </div>
        )}

        {/* Track Results */}
        <div className={viewMode === 'grid' 
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
          : 'space-y-2'
        }>
          {sortedResults.map((track, index) => (
            <div
              key={`${track.source}-${track.id}-${index}`}
              className={`bg-gray-800 rounded-lg p-4 hover:bg-gray-700 transition-all cursor-pointer ${
                viewMode === 'list' ? 'flex items-center gap-4' : ''
              }`}
              onClick={() => onTrackSelect && onTrackSelect(track)}
            >
              {/* Album Art */}
              <div className={`${viewMode === 'list' ? 'w-12 h-12' : 'w-full aspect-square'} bg-gray-600 rounded-lg mb-3 ${viewMode === 'list' ? 'mb-0' : ''} flex-shrink-0 relative overflow-hidden`}>
                {track.artwork_url ? (
                  <img 
                    src={track.artwork_url} 
                    alt={track.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Music className="w-6 h-6 text-gray-400" />
                  </div>
                )}
                
                {/* Service Badge */}
                <div className="absolute top-1 right-1">
                  <span className="text-xs bg-black bg-opacity-70 rounded px-1">
                    {serviceConfig[track.source]?.icon}
                  </span>
                </div>
              </div>

              {/* Track Info */}
              <div className={`${viewMode === 'list' ? 'flex-1 min-w-0' : ''}`}>
                <h4 className={`font-semibold ${viewMode === 'list' ? 'text-sm' : 'text-base'} truncate`}>
                  {track.title || track.name}
                </h4>
                <p className={`text-gray-400 ${viewMode === 'list' ? 'text-xs' : 'text-sm'} truncate`}>
                  {track.artist || track.user?.username}
                </p>
                
                {/* Track Stats */}
                <div className={`flex items-center gap-4 mt-2 ${viewMode === 'list' ? 'text-xs' : 'text-sm'} text-gray-400`}>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDuration(track.duration || track.duration_ms)}
                  </span>
                  {track.bpm && (
                    <span>{Math.round(track.bpm)} BPM</span>
                  )}
                  {track.key && (
                    <span>{track.key}</span>
                  )}
                </div>

                {/* Quality & DJ Score */}
                <div className="flex items-center gap-2 mt-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium text-white ${getQualityColor(track.quality)}`}>
                    {track.quality?.toUpperCase()}
                  </span>
                  {track.dj_score && (
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-yellow-500" />
                      <span className="text-xs">{track.dj_score.toFixed(1)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              {viewMode === 'list' && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  {track.preview_url && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePreviewPlay(track);
                      }}
                      className="p-2 hover:bg-gray-600 rounded"
                    >
                      {previewTrack?.id === track.id && isPreviewPlaying ? 
                        <Pause className="w-4 h-4" /> : 
                        <Play className="w-4 h-4" />
                      }
                    </button>
                  )}
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onTrackLoad && onTrackLoad(track);
                    }}
                    className="p-2 hover:bg-gray-600 rounded text-blue-400"
                  >
                    <Download className="w-4 h-4" />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const newFavorites = new Set(favorites);
                      if (favorites.has(track.id)) {
                        newFavorites.delete(track.id);
                      } else {
                        newFavorites.add(track.id);
                      }
                      setFavorites(newFavorites);
                    }}
                    className={`p-2 hover:bg-gray-600 rounded ${
                      favorites.has(track.id) ? 'text-red-500' : 'text-gray-400'
                    }`}
                  >
                    <Heart className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Load More Button */}
        {searchResults.length > 0 && (
          <div className="text-center mt-8">
            <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium">
              Load More Results
            </button>
          </div>
        )}
      </div>

      {/* Search Stats Footer */}
      {searchResults.length > 0 && (
        <div className="flex-shrink-0 p-4 border-t border-gray-700 bg-gray-800">
          <div className="flex items-center justify-between text-sm text-gray-400">
            <span>
              {searchResults.length} tracks from {selectedServices.length} services
            </span>
            <div className="flex items-center gap-4">
              <span>
                DJ-Friendly: {searchResults.filter(t => (t.dj_score || 0) >= 7).length}
              </span>
              <span>
                High Quality: {searchResults.filter(t => ['master', 'lossless', 'professional'].includes(t.quality)).length}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StreamingBrowser;

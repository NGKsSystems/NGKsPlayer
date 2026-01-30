import React, { useState, useCallback, useEffect } from 'react';

const SearchFilter = ({
  onSearchChange = () => {},
  onFilterChange = () => {},
  searchTerm = '',
  filters = {},
  availableGenres = [],
  availableArtists = [],
  trackCount = 0
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchTerm);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(localSearch);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [localSearch, onSearchChange]);

  const handleFilterChange = useCallback((filterType, value) => {
    onFilterChange(filterType, value);
  }, [onFilterChange]);

  const clearAllFilters = useCallback(() => {
    setLocalSearch('');
    onSearchChange('');
    onFilterChange('genre', '');
    onFilterChange('artist', '');
    onFilterChange('bpmMin', '');
    onFilterChange('bpmMax', '');
    onFilterChange('durationMin', '');
    onFilterChange('durationMax', '');
  }, [onSearchChange, onFilterChange]);

  const hasActiveFilters = localSearch || Object.values(filters).some(v => v !== '' && v !== null && v !== undefined);

  return (
    <div className="search-filter bg-gray-800 p-3 rounded-lg">
      <div className="filter-header text-xs text-white mb-3 text-center font-bold">
        LIBRARY A - SEARCH & FILTER
      </div>

      {/* Quick Search */}
      <div className="search-section mb-3">
        <div className="search-input-container relative">
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search tracks, artists, albums..."
            className="w-full p-2 bg-gray-700 text-white text-sm rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
          />
          <div className="search-icon absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            🔍
          </div>
        </div>
        
        {localSearch && (
          <div className="search-results-info mt-1 text-xs text-gray-400">
            {trackCount} tracks match "{localSearch}"
          </div>
        )}
      </div>

      {/* Quick Filters */}
      <div className="quick-filters mb-3">
        <div className="text-xs text-gray-400 mb-2">Quick Filters:</div>
        <div className="filter-buttons flex flex-wrap gap-2">
          <button
            onClick={() => handleFilterChange('genre', 'Electronic')}
            className={`filter-btn px-2 py-1 rounded text-xs transition-colors ${
              filters.genre === 'Electronic' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            🎵 Electronic
          </button>
          <button
            onClick={() => handleFilterChange('genre', 'Rock')}
            className={`filter-btn px-2 py-1 rounded text-xs transition-colors ${
              filters.genre === 'Rock' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            🎸 Rock
          </button>
          <button
            onClick={() => handleFilterChange('genre', 'Hip Hop')}
            className={`filter-btn px-2 py-1 rounded text-xs transition-colors ${
              filters.genre === 'Hip Hop' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            🎤 Hip Hop
          </button>
          <button
            onClick={() => {
              handleFilterChange('bpmMin', '120');
              handleFilterChange('bpmMax', '140');
            }}
            className={`filter-btn px-2 py-1 rounded text-xs transition-colors ${
              filters.bpmMin === '120' && filters.bpmMax === '140'
                ? 'bg-green-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            ⚡ 120-140 BPM
          </button>
        </div>
      </div>

      {/* Advanced Filters Toggle */}
      <div className="advanced-toggle mb-3">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full text-xs text-gray-400 hover:text-white transition-colors py-1 border-t border-gray-600 pt-2"
        >
          {showAdvanced ? '▼' : '▶'} Advanced Filters
        </button>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="advanced-filters bg-gray-900 p-3 rounded space-y-3">
          {/* Genre Filter */}
          <div className="filter-group">
            <label className="text-xs text-gray-400 mb-1 block">Genre:</label>
            <select
              value={filters.genre || ''}
              onChange={(e) => handleFilterChange('genre', e.target.value)}
              className="w-full p-2 bg-gray-700 text-white text-xs rounded border border-gray-600"
            >
              <option value="">All Genres</option>
              {availableGenres.map(genre => (
                <option key={genre} value={genre}>{genre}</option>
              ))}
            </select>
          </div>

          {/* Artist Filter */}
          <div className="filter-group">
            <label className="text-xs text-gray-400 mb-1 block">Artist:</label>
            <select
              value={filters.artist || ''}
              onChange={(e) => handleFilterChange('artist', e.target.value)}
              className="w-full p-2 bg-gray-700 text-white text-xs rounded border border-gray-600"
            >
              <option value="">All Artists</option>
              {availableArtists.slice(0, 50).map(artist => (
                <option key={artist} value={artist}>{artist}</option>
              ))}
            </select>
          </div>

          {/* BPM Range */}
          <div className="filter-group">
            <label className="text-xs text-gray-400 mb-1 block">BPM Range:</label>
            <div className="flex space-x-2">
              <input
                type="number"
                placeholder="Min"
                value={filters.bpmMin || ''}
                onChange={(e) => handleFilterChange('bpmMin', e.target.value)}
                className="flex-1 p-2 bg-gray-700 text-white text-xs rounded border border-gray-600"
                min="60"
                max="200"
              />
              <span className="text-gray-400 self-center">-</span>
              <input
                type="number"
                placeholder="Max"
                value={filters.bpmMax || ''}
                onChange={(e) => handleFilterChange('bpmMax', e.target.value)}
                className="flex-1 p-2 bg-gray-700 text-white text-xs rounded border border-gray-600"
                min="60"
                max="200"
              />
            </div>
          </div>

          {/* Duration Range */}
          <div className="filter-group">
            <label className="text-xs text-gray-400 mb-1 block">Duration (minutes):</label>
            <div className="flex space-x-2">
              <input
                type="number"
                placeholder="Min"
                value={filters.durationMin || ''}
                onChange={(e) => handleFilterChange('durationMin', e.target.value)}
                className="flex-1 p-2 bg-gray-700 text-white text-xs rounded border border-gray-600"
                min="0"
                max="30"
                step="0.5"
              />
              <span className="text-gray-400 self-center">-</span>
              <input
                type="number"
                placeholder="Max"
                value={filters.durationMax || ''}
                onChange={(e) => handleFilterChange('durationMax', e.target.value)}
                className="flex-1 p-2 bg-gray-700 text-white text-xs rounded border border-gray-600"
                min="0"
                max="30"
                step="0.5"
              />
            </div>
          </div>

          {/* File Type Filter */}
          <div className="filter-group">
            <label className="text-xs text-gray-400 mb-1 block">File Type:</label>
            <div className="flex space-x-2">
              {['mp3', 'wav', 'flac', 'm4a'].map(type => (
                <button
                  key={type}
                  onClick={() => handleFilterChange('fileType', filters.fileType === type ? '' : type)}
                  className={`file-type-btn px-2 py-1 rounded text-xs transition-colors ${
                    filters.fileType === type
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  .{type}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filter Actions */}
      <div className="filter-actions mt-3 pt-3 border-t border-gray-600">
        <div className="flex justify-between items-center">
          <button
            onClick={clearAllFilters}
            disabled={!hasActiveFilters}
            className={`clear-btn px-3 py-2 rounded text-xs transition-all ${
              hasActiveFilters
                ? 'bg-red-600 hover:bg-red-500 text-white'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            Clear All
          </button>
          
          <div className="filter-summary text-xs text-gray-400">
            {hasActiveFilters && (
              <span className="text-yellow-400">
                {Object.values(filters).filter(v => v !== '' && v !== null && v !== undefined).length + (localSearch ? 1 : 0)} active filters
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="results-summary mt-2 text-xs text-gray-500">
        <div className="flex justify-between">
          <span>Results:</span>
          <span className="text-white">{trackCount.toLocaleString()} tracks</span>
        </div>
      </div>
    </div>
  );
};

export default SearchFilter;
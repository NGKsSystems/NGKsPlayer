import React, { useState, useCallback, useEffect, useMemo } from 'react';

const SampleLibrary = ({
  samples = [],
  onSampleLoad = () => {},
  onSamplePreview = () => {},
  onSampleImport = () => {},
  isLoading = false,
  categories = ['All', 'Drums', 'Vocals', 'Melody', 'FX', 'Bass']
}) => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [draggedSample, setDraggedSample] = useState(null);

  // Filter samples by category and search
  const filteredSamples = useMemo(() => {
    let filtered = samples;

    // Filter by category
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(sample => 
        sample.type?.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(sample =>
        (sample.name || '').toLowerCase().includes(searchLower) ||
        (sample.tags || []).some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    // Sort samples
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.name || '').localeCompare(b.name || '');
        case 'duration':
          return (a.duration || 0) - (b.duration || 0);
        case 'bpm':
          return (a.bpm || 0) - (b.bpm || 0);
        case 'date':
          return new Date(b.dateAdded || 0) - new Date(a.dateAdded || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [samples, selectedCategory, searchTerm, sortBy]);

  const handleSampleClick = useCallback((sample) => {
    onSamplePreview(sample);
  }, [onSamplePreview]);

  const handleSampleDoubleClick = useCallback((sample) => {
    onSampleLoad(sample);
  }, [onSampleLoad]);

  const handleDragStart = useCallback((sample, e) => {
    setDraggedSample(sample);
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', JSON.stringify({
      type: 'sample',
      sample: sample
    }));
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedSample(null);
  }, []);

  const handleImportFiles = useCallback(() => {
    // Trigger file picker for sample import
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'audio/*';
    input.onchange = (e) => {
      const files = Array.from(e.target.files);
      files.forEach(file => onSampleImport(file));
    };
    input.click();
  }, [onSampleImport]);

  const formatDuration = (ms) => {
    if (!ms) return '--:--';
    const seconds = ms / 1000;
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getFileSize = (bytes) => {
    if (!bytes) return '--';
    const kb = bytes / 1024;
    const mb = kb / 1024;
    return mb >= 1 ? `${mb.toFixed(1)}MB` : `${kb.toFixed(0)}KB`;
  };

  const getSampleIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'drums': return '🥁';
      case 'vocals': return '🎤';
      case 'melody': return '🎵';
      case 'fx': return '✨';
      case 'bass': return '🔊';
      default: return '🎶';
    }
  };

  const getCategoryCount = (category) => {
    if (category === 'All') return samples.length;
    return samples.filter(s => s.type?.toLowerCase() === category.toLowerCase()).length;
  };

  return (
    <div className="sample-library bg-gray-900 p-3 rounded-lg h-full flex flex-col">
      <div className="library-header text-xs text-white mb-3 text-center font-bold">
        SAMPLE LIBRARY
      </div>

      {/* Import Button */}
      <div className="import-section mb-3">
        <button
          onClick={handleImportFiles}
          className="import-btn w-full p-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded transition-colors flex items-center justify-center space-x-2"
        >
          <span>📁</span>
          <span>Import Samples</span>
        </button>
      </div>

      {/* Search */}
      <div className="search-section mb-3">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search samples..."
          className="w-full p-2 bg-gray-700 text-white text-sm rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
        />
      </div>

      {/* Category Filters */}
      <div className="category-section mb-3">
        <div className="text-xs text-gray-400 mb-2">Categories:</div>
        <div className="flex flex-wrap gap-1">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`category-btn px-2 py-1 rounded text-xs transition-colors ${
                selectedCategory === category
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {getSampleIcon(category)} {category} ({getCategoryCount(category)})
            </button>
          ))}
        </div>
      </div>

      {/* Sort Controls */}
      <div className="sort-section mb-3">
        <div className="flex justify-between items-center">
          <div className="text-xs text-gray-400">Sort by:</div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-gray-700 text-white text-xs px-2 py-1 rounded"
          >
            <option value="name">Name</option>
            <option value="duration">Duration</option>
            <option value="bpm">BPM</option>
            <option value="date">Date Added</option>
          </select>
        </div>
      </div>

      {/* Sample List */}
      <div className="sample-list flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="loading-state text-center text-gray-400 py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <div className="text-sm">Loading samples...</div>
          </div>
        ) : filteredSamples.length === 0 ? (
          <div className="empty-state text-center text-gray-400 py-8">
            <div className="text-2xl mb-2">🎵</div>
            <div className="text-sm">
              {searchTerm ? 'No samples match your search' : 'No samples in this category'}
            </div>
            <div className="text-xs mt-1">
              {samples.length === 0 ? 'Import some samples to get started' : 'Try a different search or category'}
            </div>
          </div>
        ) : (
          <div className="sample-items space-y-1">
            {filteredSamples.map((sample, index) => (
              <div
                key={sample.id || index}
                draggable
                onClick={() => handleSampleClick(sample)}
                onDoubleClick={() => handleSampleDoubleClick(sample)}
                onDragStart={(e) => handleDragStart(sample, e)}
                onDragEnd={handleDragEnd}
                className={`sample-item p-2 bg-gray-800 hover:bg-gray-700 rounded cursor-pointer transition-all ${
                  draggedSample === sample ? 'opacity-50' : ''
                }`}
              >
                <div className="sample-content flex items-center space-x-3">
                  {/* Sample Icon */}
                  <div className="sample-icon text-lg">
                    {getSampleIcon(sample.type)}
                  </div>

                  {/* Sample Info */}
                  <div className="sample-info flex-1 min-w-0">
                    <div className="sample-name text-sm text-white font-medium truncate">
                      {sample.name || 'Unnamed Sample'}
                    </div>
                    <div className="sample-details text-xs text-gray-400 flex space-x-4">
                      <span>{formatDuration(sample.duration)}</span>
                      {sample.bpm && <span>{sample.bpm} BPM</span>}
                      {sample.key && <span>Key: {sample.key}</span>}
                      <span>{getFileSize(sample.fileSize)}</span>
                    </div>
                  </div>

                  {/* Sample Tags */}
                  {sample.tags && sample.tags.length > 0 && (
                    <div className="sample-tags flex space-x-1">
                      {sample.tags.slice(0, 2).map(tag => (
                        <span
                          key={tag}
                          className="tag px-1 py-0.5 bg-gray-600 text-xs rounded"
                        >
                          {tag}
                        </span>
                      ))}
                      {sample.tags.length > 2 && (
                        <span className="tag px-1 py-0.5 bg-gray-600 text-xs rounded">
                          +{sample.tags.length - 2}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="sample-actions flex space-x-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSamplePreview(sample);
                      }}
                      className="action-btn p-1 bg-gray-600 hover:bg-gray-500 rounded text-xs"
                      title="Preview"
                    >
                      👂
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSampleLoad(sample);
                      }}
                      className="action-btn p-1 bg-blue-600 hover:bg-blue-500 rounded text-xs"
                      title="Load to selected pad"
                    >
                      ➕
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="status-bar mt-3 pt-2 border-t border-gray-700 text-xs text-gray-500">
        <div className="flex justify-between items-center">
          <span>{filteredSamples.length} of {samples.length} samples</span>
          <span>Double-click to load • Drag to pad</span>
        </div>
      </div>
    </div>
  );
};

export default SampleLibrary;
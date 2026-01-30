import React, { useState, useEffect } from 'react';
import { Toast } from '../components/Mixer/Common/Toast';
// import BandExceptionsManager from '../components/BandExceptionsManager.jsx';

const Settings = ({ onNavigate }) => {
  const [settings, setSettings] = useState({
    useTags: true,
    useLLM: false,
    flipReversed: true,
    recurse: false,
    model: 'openrouter/anthropic/claude-3.5-sonnet',
    openRouterApiKey: '',
    enableOnImport: false
  });
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showBandExceptions, setShowBandExceptions] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const result = await window.api.invoke('normalize:getSettings');
      if (result) {
        setSettings(result);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
      setToast({ type: 'error', message: 'Failed to load settings' });
    }
  };

  const saveSettings = async () => {
    setLoading(true);
    try {
      const result = await window.api.invoke('normalize:saveSettings', settings);
      if (result.success) {
        setToast({ type: 'success', message: 'Settings saved successfully!' });
      } else {
        setToast({ type: 'error', message: result.error || 'Failed to save settings' });
      }
    } catch (err) {
      console.error('Failed to save settings:', err);
      setToast({ type: 'error', message: 'Failed to save settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleResetLibrary = async () => {
    const confirmMessage = 
      "⚠️ RESET ENTIRE LIBRARY ⚠️\n\n" +
      "This will:\n" +
      "• Delete ALL tracks from the database\n" +
      "• Delete ALL playlists\n" +
      "• Clear ALL play history\n" +
      "• Rescan your music folders (if you choose)\n\n" +
      "This action CANNOT be undone!\n\n" +
      "Are you sure you want to continue?";
    
    if (!window.confirm(confirmMessage)) return;
    
    setLoading(true);
    try {
      // Get list of previously scanned folders
      const scannedFolders = await window.api.invoke('db:getScannedFolders');
      
      let shouldRescan = false;
      let foldersToScan = [];
      
      if (scannedFolders && scannedFolders.length > 0) {
        const rescanMessage = 
          "Would you like to automatically rescan your previous music folders?\n\n" +
          "Previous folders:\n" +
          scannedFolders.map(f => `• ${f.path} (${f.trackCount} tracks)`).join('\n') +
          "\n\nClick OK to rescan these folders, or Cancel to start fresh.";
        
        shouldRescan = window.confirm(rescanMessage);
        if (shouldRescan) {
          foldersToScan = scannedFolders.map(f => f.path);
        }
      }
      
      const result = await window.api.invoke('db:clearAndRebuild', foldersToScan);
      
      if (result.success) {
        setToast({
          type: 'success',
          message: result.message
        });
      } else {
        setToast({
          type: 'error',
          message: 'Library reset failed: ' + result.error
        });
      }
    } catch (err) {
      console.error('Library reset failed:', err);
      setToast({
        type: 'error',
        message: 'Library reset failed: ' + err.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCleanupDatabase = async () => {
    if (!window.confirm("Clean up database? This will remove entries for files that no longer exist.")) {
      return;
    }
    
    setLoading(true);
    try {
      const folder = await window.api.invoke('dialog:openFolder');
      if (folder) {
        const result = await window.api.invoke('db:cleanup', folder);
        if (result.success) {
          setToast({
            type: 'success',
            message: `Database cleaned! Removed ${result.removedCount} stale entries.`
          });
        } else {
          setToast({
            type: 'error',
            message: 'Database cleanup failed: ' + result.error
          });
        }
      }
    } catch (err) {
      console.error('Database cleanup failed:', err);
      setToast({
        type: 'error',
        message: 'Database cleanup failed: ' + err.message
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const testApiKey = async () => {
    if (!settings.openRouterApiKey) {
      setToast({ type: 'error', message: 'Please enter an API key first' });
      return;
    }

    setLoading(true);
    try {
      // Test with a simple API call
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: {
          'Authorization': `Bearer ${settings.openRouterApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setToast({ type: 'success', message: 'API key is valid!' });
      } else {
        setToast({ type: 'error', message: 'API key is invalid or expired' });
      }
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to test API key' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={() => onNavigate('library')}
          className="flex items-center gap-2 px-3 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-zinc-200 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Library
        </button>
        <h1 className="text-2xl font-bold text-zinc-100">Settings</h1>
      </div>
      
      <div className="space-y-6">
        {/* Filename Normalization Settings */}
        <section className="bg-zinc-800 rounded-xl p-4">
          <h2 className="text-lg font-semibold text-zinc-200 mb-4">Filename Normalization</h2>
          
          <div className="space-y-4">
            <label className="flex items-center gap-3">
              <input 
                type="checkbox" 
                checked={settings.enableOnImport} 
                onChange={e => updateSetting('enableOnImport', e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-zinc-300">Automatically normalize filenames when importing music</span>
            </label>
            
            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  checked={settings.useTags} 
                  onChange={e => updateSetting('useTags', e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-zinc-300">Prefer ID3/FLAC tags</span>
              </label>
              
              <label className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  checked={settings.flipReversed} 
                  onChange={e => updateSetting('flipReversed', e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-zinc-300">Auto-flip "Title - Artist"</span>
              </label>
              
              <label className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  checked={settings.useLLM} 
                  onChange={e => updateSetting('useLLM', e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-zinc-300">Use AI for complex filenames</span>
              </label>
              
              <label className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  checked={settings.recurse} 
                  onChange={e => updateSetting('recurse', e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-zinc-300">Include subfolders by default</span>
              </label>
            </div>
          </div>
        </section>
        
        {/* OpenRouter API Settings */}
        <section className="bg-zinc-800 rounded-xl p-4">
          <h2 className="text-lg font-semibold text-zinc-200 mb-4">OpenRouter AI Integration</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">API Key</label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={settings.openRouterApiKey}
                  onChange={e => updateSetting('openRouterApiKey', e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg bg-zinc-700 border border-zinc-600 text-zinc-100"
                  placeholder="sk-or-v1-..."
                />
                <button
                  onClick={testApiKey}
                  disabled={loading || !settings.openRouterApiKey}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50"
                >
                  {loading ? 'Testing...' : 'Test'}
                </button>
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                Get your API key at <a href="https://openrouter.ai" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">openrouter.ai</a>
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">AI Model</label>
              <select
                value={settings.model}
                onChange={e => updateSetting('model', e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-700 border border-zinc-600 text-zinc-100"
              >
                <option value="openrouter/anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet (Recommended)</option>
                <option value="openrouter/anthropic/claude-3-haiku">Claude 3 Haiku (Faster)</option>
                <option value="openrouter/openai/gpt-4o">GPT-4o</option>
                <option value="openrouter/openai/gpt-4o-mini">GPT-4o Mini (Cheaper)</option>
                <option value="openrouter/meta-llama/llama-3.1-8b-instruct">Llama 3.1 8B (Free)</option>
              </select>
              <p className="text-xs text-zinc-500 mt-1">
                Choose the AI model for filename analysis. Sonnet provides the best accuracy.
              </p>
            </div>
          </div>
        </section>

        {/* Band Name Exceptions */}
        <section className="bg-zinc-800 rounded-xl p-4">
          <h2 className="text-lg font-semibold text-zinc-200 mb-4">Band Name Exceptions</h2>
          
          <div className="space-y-4">
            <p className="text-sm text-zinc-400">
              Manage band name exceptions for normalization (e.g., AC/DC variants, special cases).
              These exceptions help the normalizer correctly identify and format band names.
            </p>
            
            <button
              onClick={() => setShowBandExceptions(true)}
              className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white"
            >
              Manage Band Exceptions
            </button>
          </div>
        </section>

        {/* Database Management */}
        <section className="bg-zinc-800 rounded-xl p-4">
          <h2 className="text-lg font-semibold text-zinc-200 mb-4">Database Management</h2>
          
          <div className="space-y-4">
            <div className="bg-zinc-900 rounded-lg p-4 border border-red-800">
              <h3 className="text-red-400 font-medium mb-2">⚠️ Dangerous Actions</h3>
              <p className="text-sm text-zinc-400 mb-4">
                These actions will permanently modify your music library database. 
                Always backup important data before proceeding.
              </p>
              
              <button
                onClick={handleResetLibrary}
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white disabled:opacity-50 font-medium mr-3"
              >
                🔄 Reset Entire Library
              </button>
              
              <button
                onClick={handleCleanupDatabase}
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white disabled:opacity-50 font-medium"
              >
                🧹 Cleanup Database
              </button>
              
              <p className="text-xs text-zinc-500 mt-2">
                <strong>Reset:</strong> Completely clears all tracks, playlists, and play history. 
                Optionally rescans your music folders.
              </p>
              
              <p className="text-xs text-zinc-500 mt-1">
                <strong>Cleanup:</strong> Removes database entries for files that no longer exist on disk.
              </p>
            </div>
          </div>
        </section>
      </div>
      
      <div className="mt-8 flex gap-4">
        <button
          onClick={saveSettings}
          disabled={loading}
          className="px-6 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Settings'}
        </button>
        
        <button
          onClick={loadSettings}
          disabled={loading}
          className="px-6 py-2 rounded-lg bg-zinc-600 hover:bg-zinc-500 text-white disabled:opacity-50"
        >
          Reset to Saved
        </button>
      </div>
      
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      
      {showBandExceptions && (
        <BandExceptionsManager 
          onClose={() => setShowBandExceptions(false)}
        />
      )}
    </div>
  );
};

export default Settings;

import React, { useState, useEffect } from 'react';import React, { useState, useEffect } from 'react';

import SampleBrowser from './SampleBrowser';import SampleBrowser from './SampleBrowser';

import SamplePads from './SamplePads';import SamplePadGrid from './SamplePadGrid';

import './styles.css';import './styles.css';



const Sampler = ({ audioManager }) => {const Sampler = ({ audioManager }) => {

  const [samples, setSamples] = useState([]);  const [samples, setSamples] = useState([]);

  const [loading, setLoading] = useState(false);

  return (

    <div className="sampler-container">  // Load samples from IndexedDB on mount

      <SampleBrowser onSampleLoaded={(sample) => {  useEffect(() => {

        setSamples([...samples, sample]);    loadSamplesFromDB();

      }} />  }, []);

      <SamplePads samples={samples} />

    </div>  const loadSamplesFromDB = async () => {

  );    try {

};      const db = await openDatabase();

      const tx = db.transaction('samples', 'readonly');

export default Sampler;      const store = tx.objectStore('samples');

      const allSamples = await store.getAll();
      setSamples(allSamples || []);
    } catch (error) {
      console.warn('Failed to load samples from DB:', error);
      setSamples([]);
    }
  };

  const openDatabase = () => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('NGKsSamplerDB', 2);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('samples')) {
          db.createObjectStore('samples', { keyPath: 'id', autoIncrement: true });
        }
      };
    });
  };

  const addSample = async (sample) => {
    try {
      const db = await openDatabase();
      const tx = db.transaction('samples', 'readwrite');
      const store = tx.objectStore('samples');
      await store.add(sample);
      
      // Reload samples
      await loadSamplesFromDB();
      return true;
    } catch (error) {
      console.error('Failed to add sample:', error);
      return false;
    }
  };

  const deleteSample = async (sampleId) => {
    try {
      const db = await openDatabase();
      const tx = db.transaction('samples', 'readwrite');
      const store = tx.objectStore('samples');
      await store.delete(sampleId);
      
      // Reload samples
      await loadSamplesFromDB();
      return true;
    } catch (error) {
      console.error('Failed to delete sample:', error);
      return false;
    }
  };

  return (
    <div className="sampler-container">
      {/* Browser Widget */}
      <div className="sampler-browser-widget">
        <SampleBrowser onAddSample={addSample} />
      </div>

      {/* Pad Grid Widget */}
      <div className="sampler-pads-widget">
        <SamplePadGrid 
          samples={samples} 
          onDeleteSample={deleteSample}
          audioManager={audioManager}
        />
      </div>
    </div>
  );
};

export default Sampler;
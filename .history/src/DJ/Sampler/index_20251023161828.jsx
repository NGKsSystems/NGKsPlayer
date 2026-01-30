import React, { useState, useEffect } from 'react';
import SampleBrowser from './SampleBrowser';
import SamplePadGrid from './SamplePadGrid';
import './styles.css';

const Sampler = ({ audioManager }) => {
  const [samples, setSamples] = useState([]);
  const [padAssignments, setPadAssignments] = useState({});
  const [loading, setLoading] = useState(false);

  // Load samples and assignments from IndexedDB on mount
  useEffect(() => {
    loadSamplesFromDB();
    loadAssignmentsFromDB();
  }, []);

  const loadSamplesFromDB = async () => {
    try {
      const db = await openDatabase();
      const tx = db.transaction('samples', 'readonly');
      const store = tx.objectStore('samples');
      const allSamples = await store.getAll();
      setSamples(allSamples || []);
    } catch (error) {
      console.warn('Failed to load samples from DB:', error);
      setSamples([]);
    }
  };

  const loadAssignmentsFromDB = async () => {
    try {
      const db = await openDatabase();
      const tx = db.transaction('padAssignments', 'readonly');
      const store = tx.objectStore('padAssignments');
      const data = await store.get('assignments');
      if (data) {
        setPadAssignments(data.assignments || {});
      }
    } catch (error) {
      console.warn('Failed to load assignments from DB:', error);
      setPadAssignments({});
    }
  };

  const saveAssignmentsToDB = async (assignments) => {
    try {
      const db = await openDatabase();
      const tx = db.transaction('padAssignments', 'readwrite');
      const store = tx.objectStore('padAssignments');
      await store.put({ id: 'assignments', assignments });
    } catch (error) {
      console.error('Failed to save assignments:', error);
    }
  };

  const openDatabase = () => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('NGKsSamplerDB', 2);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        try {
          if (!db.objectStoreNames.contains('samples')) {
            db.createObjectStore('samples', { keyPath: 'id', autoIncrement: true });
          }
          if (!db.objectStoreNames.contains('padAssignments')) {
            db.createObjectStore('padAssignments', { keyPath: 'id' });
          }
        } catch (error) {
          console.error('Error creating object stores:', error);
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
      
      // Remove from pad assignments
      const newAssignments = { ...padAssignments };
      Object.keys(newAssignments).forEach(padNum => {
        if (newAssignments[padNum] === sampleId) {
          delete newAssignments[padNum];
        }
      });
      setPadAssignments(newAssignments);
      await saveAssignmentsToDB(newAssignments);
      
      // Reload samples
      await loadSamplesFromDB();
      return true;
    } catch (error) {
      console.error('Failed to delete sample:', error);
      return false;
    }
  };

  const updatePadAssignment = async (padNumber, sampleId) => {
    const newAssignments = { ...padAssignments };
    if (sampleId === null) {
      delete newAssignments[padNumber];
    } else {
      newAssignments[padNumber] = sampleId;
    }
    setPadAssignments(newAssignments);
    await saveAssignmentsToDB(newAssignments);
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
          padAssignments={padAssignments}
          onUpdatePadAssignment={updatePadAssignment}
          onDeleteSample={deleteSample}
          audioManager={audioManager}
        />
      </div>
    </div>
  );
};

export default Sampler;
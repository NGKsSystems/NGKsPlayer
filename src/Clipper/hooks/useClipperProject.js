/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: useClipperProject.js
 * Purpose: TODO â€“ describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
import { useState, useCallback, useEffect } from 'react';

const DB_NAME = 'NGKsClipperDB';
const STORE_NAME = 'projects';
const DB_VERSION = 1;

// Initialize IndexedDB
const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'projectId' });
      }
    };
  });
};

export const useClipperProject = () => {
  const [clips, setClips] = useState([]);
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Create new project
  const createProject = useCallback((audioFileData) => {
    const projectId = `clipper_${Date.now()}`;
    setCurrentProjectId(projectId);
    setAudioFile(audioFileData);
    setClips([]);
    return projectId;
  }, []);

  // Add clip to project
  const addClip = useCallback((clip) => {
    const newClip = {
      id: `clip_${Date.now()}`,
      timestamp: Date.now(),
      ...clip
    };
    setClips((prev) => [...prev, newClip]);
    return newClip;
  }, []);

  // Delete clip from project
  const deleteClip = useCallback((clipId) => {
    setClips((prev) => prev.filter((c) => c.id !== clipId));
  }, []);

  // Update clip in project
  const updateClip = useCallback((clipId, updates) => {
    setClips((prev) =>
      prev.map((c) => (c.id === clipId ? { ...c, ...updates } : c))
    );
  }, []);

  // Save project to IndexedDB
  const saveProject = useCallback(async () => {
    if (!currentProjectId) return false;

    try {
      setIsLoading(true);
      const db = await initDB();
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const projectData = {
        projectId: currentProjectId,
        audioFile: audioFile,
        clips: clips,
        timestamp: Date.now(),
        lastModified: Date.now()
      };

      const request = store.put(projectData);

      return new Promise((resolve, reject) => {
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          setIsLoading(false);
          resolve(true);
        };
      });
    } catch (error) {
      console.error('Error saving project:', error);
      setIsLoading(false);
      return false;
    }
  }, [currentProjectId, audioFile, clips]);

  // Load project from IndexedDB
  const loadProject = useCallback(async (projectId) => {
    try {
      setIsLoading(true);
      const db = await initDB();
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(projectId);

      return new Promise((resolve, reject) => {
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          if (request.result) {
            setCurrentProjectId(request.result.projectId);
            setAudioFile(request.result.audioFile);
            setClips(request.result.clips);
            setIsLoading(false);
            resolve(request.result);
          } else {
            setIsLoading(false);
            reject(new Error('Project not found'));
          }
        };
      });
    } catch (error) {
      console.error('Error loading project:', error);
      setIsLoading(false);
      return null;
    }
  }, []);

  // Get all projects
  const getAllProjects = useCallback(async () => {
    try {
      const db = await initDB();
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      return new Promise((resolve, reject) => {
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
      });
    } catch (error) {
      console.error('Error getting all projects:', error);
      return [];
    }
  }, []);

  // Delete project from IndexedDB
  const deleteProject = useCallback(async (projectId) => {
    try {
      const db = await initDB();
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(projectId);

      return new Promise((resolve, reject) => {
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          if (currentProjectId === projectId) {
            setCurrentProjectId(null);
            setAudioFile(null);
            setClips([]);
          }
          resolve(true);
        };
      });
    } catch (error) {
      console.error('Error deleting project:', error);
      return false;
    }
  }, [currentProjectId]);

  // Reset current project
  const resetProject = useCallback(() => {
    setCurrentProjectId(null);
    setAudioFile(null);
    setClips([]);
  }, []);

  return {
    // State
    clips,
    currentProjectId,
    audioFile,
    isLoading,

    // Actions
    createProject,
    addClip,
    deleteClip,
    updateClip,
    resetProject,

    // Persistence
    saveProject,
    loadProject,
    getAllProjects,
    deleteProject
  };
};


import React, { useState, useEffect } from 'react';
import { Save, FolderOpen, Trash2, Plus, Clock, FileAudio, X } from 'lucide-react';
import './ProjectManager.css';

/**
 * Project Manager Component
 * 
 * Features:
 * - Save/load projects
 * - Project history
 * - Project templates
 * - Auto-save functionality
 */
const ProjectManager = ({ currentProject, onLoadProject, onClose }) => {
  // Debug props
  console.log('ProjectManager rendered with props:', { currentProject, onLoadProject, onClose });
  
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectName, setProjectName] = useState('');
  const [showNewProject, setShowNewProject] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // Load projects from localStorage on mount
  useEffect(() => {
    loadProjectsList();
  }, []);

  const loadProjectsList = () => {
    try {
      const savedProjects = localStorage.getItem('pro-clipper-projects');
      if (savedProjects) {
        setProjects(JSON.parse(savedProjects));
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const saveProjectsList = (updatedProjects) => {
    try {
      localStorage.setItem('pro-clipper-projects', JSON.stringify(updatedProjects));
      setProjects(updatedProjects);
    } catch (error) {
      console.error('Failed to save projects:', error);
      alert('Failed to save projects list');
    }
  };

  const saveCurrentProject = () => {
    if (!projectName.trim()) {
      alert('Please enter a project name');
      return;
    }

    const baseProject = {
      id: Date.now().toString(),
      name: projectName.trim(),
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      file: currentProject?.file || null,
      clips: currentProject?.clips || [],
      timeline: currentProject?.timeline || { zoom: 1, viewport: 0 },
      settings: currentProject?.settings || {}
    };
    
    // Apply template settings if a template is selected
    let project = { ...baseProject };
    if (selectedTemplate) {
      project = {
        ...baseProject,
        timeline: selectedTemplate.timeline,
        settings: selectedTemplate.settings
      };
    }

    const updatedProjects = [project, ...projects.filter(p => p.name !== project.name)];
    saveProjectsList(updatedProjects);
    
    setProjectName('');
    setShowNewProject(false);
    setSelectedTemplate(null);
    
    // Load the created project
    if (onLoadProject) {
      const feedbackMessage = selectedTemplate 
        ? `✅ ${project.name} created from ${selectedTemplate.name} template!\n\n• Timeline zoom: ${selectedTemplate.timeline.zoom}x\n• Buffer size: ${selectedTemplate.settings.bufferSize}\n• Sample rate: ${selectedTemplate.settings.sampleRate}Hz`
        : 'Project saved successfully!';
      
      setTimeout(() => {
        alert(feedbackMessage);
      }, 100);
      
      onLoadProject(project);
      onClose();
    } else {
      alert('Project saved successfully!');
    }
  };

  const loadProject = (project) => {
    if (onLoadProject) {
      onLoadProject(project);
      onClose();
    }
  };

  const deleteProject = (projectId) => {
    if (confirm('Are you sure you want to delete this project?')) {
      const updatedProjects = projects.filter(p => p.id !== projectId);
      saveProjectsList(updatedProjects);
    }
  };

  const createNewProject = () => {
    setProjectName('');
    setSelectedTemplate(null);
    setShowNewProject(true);
  };

  // Template definitions
  const templates = {
    'music-editing': {
      name: 'Music Editing Project',
      settings: { bufferSize: 4096, sampleRate: 44100 },
      timeline: { zoom: 1.5, viewport: 0 }
    },
    'podcast-editing': {
      name: 'Podcast Editing Project', 
      settings: { bufferSize: 2048, sampleRate: 44100 },
      timeline: { zoom: 2.0, viewport: 0 }
    },
    'sample-creation': {
      name: 'Sample Creation Project',
      settings: { bufferSize: 1024, sampleRate: 48000 },
      timeline: { zoom: 3.0, viewport: 0 }
    }
  };

  const applyTemplate = (templateId) => {
    console.log('=== applyTemplate called ===');
    console.log('templateId:', templateId);
    console.log('templates object:', templates);
    
    const template = templates[templateId];
    if (!template) {
      console.error('Template not found:', templateId);
      alert('Template not found: ' + templateId);
      return;
    }
    
    console.log('✅ Template found:', template);
    
    try {
      // Set up the new project form with template settings
      console.log('Setting selected template...');
      setSelectedTemplate(template);
      
      console.log('Setting project name...');
      setProjectName(template.name); // Pre-fill with template name, user can edit
      
      console.log('Setting showNewProject to true...');
      setShowNewProject(true);
      
      console.log('✅ Template applied successfully, form should be visible');
    } catch (error) {
      console.error('❌ Error applying template:', error);
      alert('Error applying template: ' + error.message);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getProjectStats = (project) => {
    const clipsCount = project.clips?.length || 0;
    const totalDuration = project.clips?.reduce((total, clip) => total + (clip.duration || 0), 0) || 0;
    return { clipsCount, totalDuration };
  };

  return (
    <div className="project-manager-overlay">
      <div className="project-manager">
        <div className="project-header">
          <h2>
            <FolderOpen size={24} />
            Project Manager
          </h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="project-content">
          {/* Current Project Section */}
          <div className="current-project-section">
            <h3>Current Project</h3>
            {showNewProject || currentProject ? (
              <div className="current-project-info">
                {currentProject && (
                  <div className="project-details">
                    <div><strong>File:</strong> {currentProject.file || 'No file loaded'}</div>
                    <div><strong>Clips:</strong> {currentProject.clips?.length || 0}</div>
                    <div><strong>Total Duration:</strong> {
                      (currentProject.clips?.reduce((total, clip) => total + (clip.duration || 0), 0) || 0).toFixed(2)
                    }s</div>
                  </div>
                )}
                
                <div className="save-project-form">
                  {showNewProject ? (
                    <div className="new-project-form">
                      {selectedTemplate && (
                        <div className="template-indicator" style={{
                          background: 'rgba(0, 212, 255, 0.1)',
                          border: '1px solid rgba(0, 212, 255, 0.3)',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          marginBottom: '12px',
                          fontSize: '13px',
                          color: '#00d4ff'
                        }}>
                          ✨ <strong>Creating from template:</strong> {selectedTemplate.name}
                          <br />
                          <span style={{ fontSize: '11px', opacity: 0.8 }}>
                            Zoom: {selectedTemplate.timeline.zoom}x • Buffer: {selectedTemplate.settings.bufferSize} • Rate: {selectedTemplate.settings.sampleRate}Hz
                          </span>
                        </div>
                      )}
                      <input
                        type="text"
                        placeholder={selectedTemplate ? "Enter your project name..." : "Enter project name..."}
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        className="project-name-input"
                        autoFocus
                      />
                      <div className="form-actions">
                        <button onClick={saveCurrentProject} className="save-btn">
                          <Save size={16} />
                          {selectedTemplate ? 'Create Project' : 'Save'}
                        </button>
                        <button onClick={() => {
                          setShowNewProject(false);
                          setSelectedTemplate(null);
                          setProjectName('');
                        }} className="cancel-btn">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : currentProject ? (
                    <button onClick={createNewProject} className="new-project-btn">
                      <Plus size={16} />
                      Save as New Project
                    </button>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="no-current-project">
                No project loaded. Use templates below to create a new project.
              </div>
            )}
          </div>

          {/* Saved Projects Section */}
          <div className="saved-projects-section">
            <h3>Saved Projects ({projects.length})</h3>
            
            {projects.length === 0 ? (
              <div className="no-projects">
                <FileAudio size={48} className="no-projects-icon" />
                <p>No saved projects yet.</p>
                <p>Create your first project by loading an audio file and saving it above.</p>
              </div>
            ) : (
              <div className="projects-list">
                {projects.map(project => {
                  const stats = getProjectStats(project);
                  return (
                    <div
                      key={project.id}
                      className={`project-item ${selectedProject?.id === project.id ? 'selected' : ''}`}
                      onClick={() => setSelectedProject(project)}
                    >
                      <div className="project-info">
                        <div className="project-name">{project.name}</div>
                        <div className="project-details">
                          <div className="project-file">
                            <FileAudio size={14} />
                            {project.file || 'No file'}
                          </div>
                          <div className="project-stats">
                            {stats.clipsCount} clips • {stats.totalDuration.toFixed(2)}s
                          </div>
                          <div className="project-dates">
                            <Clock size={14} />
                            Created: {formatDate(project.created)}
                            {project.modified !== project.created && (
                              <div>Modified: {formatDate(project.modified)}</div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="project-actions">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            loadProject(project);
                          }}
                          className="load-btn"
                          title="Load Project"
                        >
                          <FolderOpen size={16} />
                        </button>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteProject(project.id);
                          }}
                          className="delete-btn"
                          title="Delete Project"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Project Templates Section */}
          <div className="templates-section">
            <h3>Quick Start Templates</h3>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', margin: '0 0 16px 0' }}>
              Choose a template to create a new project with optimized settings
            </p>
            <div className="templates-list">
              <div className="template-item">
                <div className="template-info">
                  <div className="template-name">Music Editing</div>
                  <div className="template-desc">Pre-configured for music track editing and loop creation</div>
                </div>
                <button 
                  className="template-btn" 
                  onClick={() => {
                    console.log('Music template button clicked!');
                    applyTemplate('music-editing');
                  }}
                >
                  Create Project
                </button>
              </div>
              
              <div className="template-item">
                <div className="template-info">
                  <div className="template-name">Podcast Editing</div>
                  <div className="template-desc">Optimized for speech editing and noise reduction</div>
                </div>
                <button 
                  className="template-btn" 
                  onClick={() => {
                    console.log('Podcast template button clicked!');
                    applyTemplate('podcast-editing');
                  }}
                >
                  Create Project
                </button>
              </div>
              
              <div className="template-item">
                <div className="template-info">
                  <div className="template-name">Sample Creation</div>
                  <div className="template-desc">Perfect for creating short audio samples and clips</div>
                </div>
                <button 
                  className="template-btn" 
                  onClick={() => {
                    console.log('Sample template button clicked!');
                    applyTemplate('sample-creation');
                  }}
                >
                  Create Project
                </button>
              </div>
            </div>
          </div>

          {/* Auto-save Settings */}
          <div className="settings-section">
            <h3>Settings</h3>
            <div className="settings-options">
              <label className="setting-option">
                <input type="checkbox" defaultChecked />
                Auto-save projects every 5 minutes
              </label>
              
              <label className="setting-option">
                <input type="checkbox" defaultChecked />
                Keep project history (undo/redo)
              </label>
              
              <label className="setting-option">
                <input type="checkbox" />
                Backup projects to cloud storage
              </label>
            </div>
          </div>
        </div>

        <div className="project-footer">
          <button onClick={onClose} className="footer-btn">
            Close
          </button>
          
          {selectedProject && (
            <button
              onClick={() => loadProject(selectedProject)}
              className="footer-btn primary"
            >
              Load Selected Project
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectManager;
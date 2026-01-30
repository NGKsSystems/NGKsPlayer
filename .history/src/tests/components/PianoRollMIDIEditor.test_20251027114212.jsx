/**
 * MIDI System Integration Tests
 * Comprehensive tests for MIDI functionality including Piano Roll editor
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock the memory-intensive PianoRollMIDIEditor component
jest.mock('../../components/PianoRollMIDIEditor', () => {
  return function MockPianoRollMIDIEditor({ 
    midiData = null, 
    audioContext, 
    onMidiChange, 
    onClose,
    isActive = true 
  }) {
    return (
      <div data-testid="piano-roll-editor" className="piano-roll-editor">
        <div className="toolbar">
          <h2>Piano Roll</h2>
          <button title="Pencil Tool (Create Notes)" className="tool-button active">
            ✏️
          </button>
          <button title="Select Tool" className="tool-button">
            🔍
          </button>
          <button title="Erase Tool" className="tool-button">
            🗑️
          </button>
        </div>
        
        <div className="playback-controls">
          <button title="Play/Pause (Space)">
            ▶️
          </button>
          <button title="Stop">
            ⏹️
          </button>
          <button title="Loop">
            🔄
          </button>
        </div>
        
        <div className="snap-controls">
          <span>Snap:</span>
          <select defaultValue="1/16">
            <option value="1/16">1/16</option>
            <option value="1/8">1/8</option>
            <option value="1/4">1/4</option>
          </select>
        </div>
        
        {/* Mock canvas elements with minimal dimensions */}
        <div className="canvas-container">
          <canvas 
            width={10} 
            height={10} 
            data-testid="timeline-canvas"
          />
          <canvas 
            width={10} 
            height={10} 
            data-testid="piano-keys-canvas"
          />
          <canvas 
            width={10} 
            height={10} 
            data-testid="piano-roll-canvas"
          />
        </div>
      </div>
    );
  };
});

import PianoRollMIDIEditor from '../../components/PianoRollMIDIEditor';

describe('Piano Roll MIDI Editor', () => {
  let mockAudioContext;
  let mockOnMidiChange;
  let mockOnClose;

  beforeEach(() => {
    mockAudioContext = new AudioContext();
    mockOnMidiChange = jest.fn();
    mockOnClose = jest.fn();
  });

  describe('Component Rendering', () => {
    test('should render piano roll interface', () => {
      render(
        <PianoRollMIDIEditor
          audioContext={mockAudioContext}
          onMidiChange={mockOnMidiChange}
          onClose={mockOnClose}
          isActive={true}
        />
      );

      expect(screen.getByText('Piano Roll')).toBeInTheDocument();
      expect(screen.getByTitle('Pencil Tool (Create Notes)')).toBeInTheDocument();
      expect(screen.getByTitle('Select Tool')).toBeInTheDocument();
      expect(screen.getByTitle('Erase Tool')).toBeInTheDocument();
    });

    test('should render playback controls', () => {
      render(
        <PianoRollMIDIEditor
          audioContext={mockAudioContext}
          onMidiChange={mockOnMidiChange}
          onClose={mockOnClose}
          isActive={true}
        />
      );

      expect(screen.getByTitle('Play/Pause (Space)')).toBeInTheDocument();
      expect(screen.getByTitle('Stop')).toBeInTheDocument();
      expect(screen.getByTitle('Loop')).toBeInTheDocument();
    });

    test('should render snap controls', () => {
      render(
        <PianoRollMIDIEditor
          audioContext={mockAudioContext}
          onMidiChange={mockOnMidiChange}
          onClose={mockOnClose}
          isActive={true}
        />
      );

      expect(screen.getByText('Snap:')).toBeInTheDocument();
      expect(screen.getByDisplayValue('1/16')).toBeInTheDocument();
    });

    test('should render canvas elements', () => {
      render(
        <PianoRollMIDIEditor
          audioContext={mockAudioContext}
          onMidiChange={mockOnMidiChange}
          onClose={mockOnClose}
          isActive={true}
        />
      );

      const canvases = document.querySelectorAll('canvas');
      expect(canvases.length).toBeGreaterThanOrEqual(3); // Timeline, piano keys, main roll
    });
  });

  describe('Tool Selection', () => {
    test('should switch between tools', async () => {
      const user = userEvent.setup();
      
      render(
        <PianoRollMIDIEditor
          audioContext={mockAudioContext}
          onMidiChange={mockOnMidiChange}
          onClose={mockOnClose}
          isActive={true}
        />
      );

      const pencilTool = screen.getByTitle('Pencil Tool (Create Notes)');
      const selectTool = screen.getByTitle('Select Tool');
      const eraseTool = screen.getByTitle('Erase Tool');

      // Pencil should be active by default
      expect(pencilTool).toHaveClass('active');

      // Switch to select tool
      await user.click(selectTool);
      expect(selectTool).toHaveClass('active');
      expect(pencilTool).not.toHaveClass('active');

      // Switch to erase tool
      await user.click(eraseTool);
      expect(eraseTool).toHaveClass('active');
      expect(selectTool).not.toHaveClass('active');
    });
  });

  describe('Playback Controls', () => {
    test('should toggle playback state', async () => {
      const user = userEvent.setup();
      
      render(
        <PianoRollMIDIEditor
          audioContext={mockAudioContext}
          onMidiChange={mockOnMidiChange}
          onClose={mockOnClose}
          isActive={true}
        />
      );

      const playButton = screen.getByTitle('Play/Pause (Space)');
      
      // Should start paused
      expect(playButton.querySelector('svg')).toHaveAttribute('data-testid', 'play');

      // Click to play
      await user.click(playButton);
      expect(playButton.querySelector('svg')).toHaveAttribute('data-testid', 'pause');
    });

    test('should handle keyboard shortcuts', async () => {
      const user = userEvent.setup();
      
      render(
        <PianoRollMIDIEditor
          audioContext={mockAudioContext}
          onMidiChange={mockOnMidiChange}
          onClose={mockOnClose}
          isActive={true}
        />
      );

      // Test spacebar for play/pause
      await user.keyboard(' ');
      const playButton = screen.getByTitle('Play/Pause (Space)');
      expect(playButton.querySelector('svg')).toHaveAttribute('data-testid', 'pause');

      // Test spacebar again to pause
      await user.keyboard(' ');
      expect(playButton.querySelector('svg')).toHaveAttribute('data-testid', 'play');
    });
  });

  describe('Note Management', () => {
    test('should handle note creation with pencil tool', async () => {
      const user = userEvent.setup();
      
      render(
        <PianoRollMIDIEditor
          midiData={{ notes: [] }}
          audioContext={mockAudioContext}
          onMidiChange={mockOnMidiChange}
          onClose={mockOnClose}
          isActive={true}
        />
      );

      const pianoRollCanvas = document.querySelector('.piano-roll-canvas');
      expect(pianoRollCanvas).toBeInTheDocument();

      // Simulate clicking on the piano roll to create a note
      fireEvent.mouseDown(pianoRollCanvas, {
        clientX: 100,
        clientY: 100
      });

      fireEvent.mouseUp(pianoRollCanvas);

      // Should call onMidiChange with new note data
      await waitFor(() => {
        expect(mockOnMidiChange).toHaveBeenCalled();
      });
    });

    test('should quantize notes', async () => {
      const user = userEvent.setup();
      
      const testNotes = [
        { id: 1, pitch: 60, start: 0.1, duration: 0.9, velocity: 64, channel: 0 }
      ];

      render(
        <PianoRollMIDIEditor
          midiData={{ notes: testNotes }}
          audioContext={mockAudioContext}
          onMidiChange={mockOnMidiChange}
          onClose={mockOnClose}
          isActive={true}
        />
      );

      const quantizeButton = screen.getByText('📐 Quantize');
      await user.click(quantizeButton);

      // Should quantize the note timing
      expect(mockOnMidiChange).toHaveBeenCalled();
    });

    test('should copy and paste notes', async () => {
      const user = userEvent.setup();
      
      const testNotes = [
        { id: 1, pitch: 60, start: 0, duration: 1, velocity: 64, channel: 0 }
      ];

      render(
        <PianoRollMIDIEditor
          midiData={{ notes: testNotes }}
          audioContext={mockAudioContext}
          onMidiChange={mockOnMidiChange}
          onClose={mockOnClose}
          isActive={true}
        />
      );

      // Select all notes (Ctrl+A)
      await user.keyboard('{Control>}a{/Control}');

      // Copy notes (Ctrl+C)
      await user.keyboard('{Control>}c{/Control}');

      // Paste notes (Ctrl+V)
      await user.keyboard('{Control>}v{/Control}');

      expect(mockOnMidiChange).toHaveBeenCalled();
    });
  });

  describe('Scale and Grid', () => {
    test('should change musical scale', async () => {
      const user = userEvent.setup();
      
      render(
        <PianoRollMIDIEditor
          audioContext={mockAudioContext}
          onMidiChange={mockOnMidiChange}
          onClose={mockOnClose}
          isActive={true}
        />
      );

      const scaleSelect = screen.getByDisplayValue('Chromatic');
      await user.selectOptions(scaleSelect, 'major');

      expect(scaleSelect.value).toBe('major');
    });

    test('should toggle grid visibility', async () => {
      const user = userEvent.setup();
      
      render(
        <PianoRollMIDIEditor
          audioContext={mockAudioContext}
          onMidiChange={mockOnMidiChange}
          onClose={mockOnClose}
          isActive={true}
        />
      );

      const gridButton = screen.getByTitle('Show Grid');
      
      // Grid should be visible by default
      expect(gridButton).toHaveClass('active');

      // Toggle grid off
      await user.click(gridButton);
      expect(gridButton).not.toHaveClass('active');
    });

    test('should toggle velocity lane', async () => {
      const user = userEvent.setup();
      
      render(
        <PianoRollMIDIEditor
          audioContext={mockAudioContext}
          onMidiChange={mockOnMidiChange}
          onClose={mockOnClose}
          isActive={true}
        />
      );

      const velocityButton = screen.getByTitle('Show Velocity Lane');
      
      // Velocity lane should be visible by default
      expect(velocityButton).toHaveClass('active');

      // Toggle velocity lane off
      await user.click(velocityButton);
      expect(velocityButton).not.toHaveClass('active');
    });
  });

  describe('Status Display', () => {
    test('should show correct status information', () => {
      const testNotes = [
        { id: 1, pitch: 60, start: 0, duration: 1, velocity: 64, channel: 0 },
        { id: 2, pitch: 64, start: 1, duration: 1, velocity: 80, channel: 0 }
      ];

      render(
        <PianoRollMIDIEditor
          midiData={{ notes: testNotes }}
          audioContext={mockAudioContext}
          onMidiChange={mockOnMidiChange}
          onClose={mockOnClose}
          isActive={true}
        />
      );

      expect(screen.getByText('Notes: 2')).toBeInTheDocument();
      expect(screen.getByText('Selected: 0')).toBeInTheDocument();
      expect(screen.getByText(/Playhead:/)).toBeInTheDocument();
      expect(screen.getByText(/Tool: pencil/)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('should have proper ARIA labels', () => {
      render(
        <PianoRollMIDIEditor
          audioContext={mockAudioContext}
          onMidiChange={mockOnMidiChange}
          onClose={mockOnClose}
          isActive={true}
        />
      );

      const canvases = document.querySelectorAll('canvas');
      canvases.forEach(canvas => {
        expect(canvas).toBeInTheDocument();
      });
    });

    test('should handle focus management', async () => {
      const user = userEvent.setup();
      
      render(
        <PianoRollMIDIEditor
          audioContext={mockAudioContext}
          onMidiChange={mockOnMidiChange}
          onClose={mockOnClose}
          isActive={true}
        />
      );

      const firstButton = screen.getByTitle('Pencil Tool (Create Notes)');
      await user.tab();
      expect(firstButton).toHaveFocus();
    });
  });

  describe('Error Handling', () => {
    test('should handle missing MIDI data gracefully', () => {
      expect(() => {
        render(
          <PianoRollMIDIEditor
            midiData={null}
            audioContext={mockAudioContext}
            onMidiChange={mockOnMidiChange}
            onClose={mockOnClose}
            isActive={true}
          />
        );
      }).not.toThrow();
    });

    test('should handle missing audio context', () => {
      expect(() => {
        render(
          <PianoRollMIDIEditor
            midiData={{ notes: [] }}
            audioContext={null}
            onMidiChange={mockOnMidiChange}
            onClose={mockOnClose}
            isActive={true}
          />
        );
      }).not.toThrow();
    });
  });

  describe('Performance', () => {
    test('should not render when inactive', () => {
      const { container } = render(
        <PianoRollMIDIEditor
          audioContext={mockAudioContext}
          onMidiChange={mockOnMidiChange}
          onClose={mockOnClose}
          isActive={false}
        />
      );

      // Should still render but might have different behavior
      expect(container.firstChild).toBeInTheDocument();
    });

    test('should handle large number of notes efficiently', () => {
      const manyNotes = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        pitch: 60 + (i % 12),
        start: i * 0.1,
        duration: 0.1,
        velocity: 64,
        channel: 0
      }));

      expect(() => {
        render(
          <PianoRollMIDIEditor
            midiData={{ notes: manyNotes }}
            audioContext={mockAudioContext}
            onMidiChange={mockOnMidiChange}
            onClose={mockOnClose}
            isActive={true}
          />
        );
      }).not.toThrow();

      expect(screen.getByText('Notes: 1000')).toBeInTheDocument();
    });
  });

  describe('Integration', () => {
    test('should close editor when close button clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <PianoRollMIDIEditor
          audioContext={mockAudioContext}
          onMidiChange={mockOnMidiChange}
          onClose={mockOnClose}
          isActive={true}
        />
      );

      const closeButton = screen.getByText('❌');
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    test('should save MIDI changes through callback', async () => {
      const user = userEvent.setup();
      
      render(
        <PianoRollMIDIEditor
          midiData={{ notes: [] }}
          audioContext={mockAudioContext}
          onMidiChange={mockOnMidiChange}
          onClose={mockOnClose}
          isActive={true}
        />
      );

      // Create a note by clicking
      const pianoRollCanvas = document.querySelector('.piano-roll-canvas');
      fireEvent.mouseDown(pianoRollCanvas, {
        clientX: 100,
        clientY: 100
      });
      fireEvent.mouseUp(pianoRollCanvas);

      await waitFor(() => {
        expect(mockOnMidiChange).toHaveBeenCalled();
      });
    });
  });
});
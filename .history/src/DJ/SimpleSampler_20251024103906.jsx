import React, { useState, useRef } from 'react';

const Sampler = ({ audioManager }) => {
  const [samples, setSamples] = useState([]);
  const scrollContainerRef = useRef(null);
  const [scrollPosition, setScrollPosition] = useState(0);

  // Constants for your requirements
  const MAX_SAMPLE_PADS = 100;
  const EMPTY_PADS_BUFFER = 5;
  const VISIBLE_PADS = 10;

  // Calculate total pads (samples + buffer, up to 100 max)
  const totalPadsNeeded = Math.min(samples.length + EMPTY_PADS_BUFFER, MAX_SAMPLE_PADS);
  const renderPads = Array.from({ length: totalPadsNeeded }, (_, index) => {
    return samples[index] || null; // null = empty pad
  });

  return (
    <div style={{
      background: 'linear-gradient(145deg, #2c3e50, #34495e)',
      border: '2px solid #3498db',
      borderRadius: '12px',
      padding: '12px',
      color: 'white',
      fontFamily: 'Arial, sans-serif',
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px',
        paddingBottom: '8px',
        borderBottom: '1px solid #3498db'
      }}>
        <h3 style={{ margin: 0, fontSize: '18px', color: '#3498db' }}>
          Sample Pads ({samples.length}/{MAX_SAMPLE_PADS})
        </h3>
        <button style={{
          background: 'linear-gradient(145deg, #3498db, #2980b9)',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          padding: '6px 12px',
          fontSize: '12px',
          cursor: 'pointer'
        }}>
          + Add Files
        </button>
      </div>

      {/* Navigation Controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px',
        background: 'rgba(0,0,0,0.3)',
        borderRadius: '6px',
        marginBottom: '8px'
      }}>
        <button
          onClick={() => {
            const container = scrollContainerRef.current;
            if (container) {
              container.scrollBy({ left: -320, behavior: 'smooth' });
            }
          }}
          style={{
            background: 'linear-gradient(145deg, #3498db, #2980b9)',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            padding: '6px 12px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          ◀ Prev
        </button>
        
        <div style={{ 
          flex: 1, 
          textAlign: 'center',
          color: '#fff',
          fontSize: '12px'
        }}>
          Pads {Math.floor(scrollPosition / 170) + 1}-{Math.min(Math.floor(scrollPosition / 170) + VISIBLE_PADS, totalPadsNeeded)} of {totalPadsNeeded}
        </div>
        
        <button
          onClick={() => {
            const container = scrollContainerRef.current;
            if (container) {
              container.scrollBy({ left: 320, behavior: 'smooth' });
            }
          }}
          style={{
            background: 'linear-gradient(145deg, #3498db, #2980b9)',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            padding: '6px 12px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          Next ▶
        </button>
      </div>

      {/* Horizontal Scrolling Container */}
      <div 
        ref={scrollContainerRef}
        onScroll={(e) => setScrollPosition(e.target.scrollLeft)}
        style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          overflowY: 'hidden',
          flex: 1,
          padding: '4px',
          scrollbarWidth: 'thin',
          scrollbarColor: '#3498db #1e1e2e'
        }}
      >
        {renderPads.map((sample, index) => (
          <div 
            key={sample?.id || `empty-${index}`} 
            style={{
              background: sample 
                ? 'linear-gradient(145deg, #2a2a3e, #1e1e2e)'
                : 'linear-gradient(145deg, #1a1a1a, #2a2a2a)',
              border: sample ? '2px solid #fff' : '2px dashed #666',
              borderRadius: '8px',
              padding: '8px 6px 6px 6px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'space-between',
              minHeight: '120px',
              minWidth: '160px', // Fixed 160px width as requested
              maxWidth: '160px',
              textAlign: 'center',
              boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
              transition: 'all 0.2s ease',
              position: 'relative',
              flexShrink: 0 // Prevents shrinking in flex container
            }}
          >
            {sample ? (
              <>
                {/* Sample Content */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ 
                    fontSize: '18px', 
                    fontWeight: 'bold', 
                    color: '#3498db',
                    marginBottom: '4px'
                  }}>
                    {index + 1}
                  </div>
                  <div style={{ 
                    fontSize: '14px', 
                    color: '#ffffff',
                    fontWeight: 'bold',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '100%',
                    marginBottom: '2px'
                  }}>
                    {sample.name}
                  </div>
                </div>

                {/* Play Buttons */}
                <div style={{ 
                  display: 'flex', 
                  gap: '2px',
                  marginTop: '4px',
                  width: '100%'
                }}>
                  <button style={{
                    background: 'linear-gradient(145deg, #27ae60, #229954)',
                    color: 'white',
                    border: '1px solid #fff',
                    borderRadius: '4px',
                    padding: '6px 8px',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    flex: 1
                  }}>
                    ▶ MAIN
                  </button>
                  <button style={{
                    background: 'linear-gradient(145deg, #f39c12, #e67e22)',
                    color: 'white',
                    border: '1px solid #fff',
                    borderRadius: '4px',
                    padding: '6px 8px',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    flex: 1
                  }}>
                    🎧 CUE
                  </button>
                </div>
              </>
            ) : (
              /* Empty Pad */
              <div style={{ 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: '#666',
                fontSize: '12px'
              }}>
                <div style={{ fontSize: '18px', marginBottom: '8px' }}>+</div>
                <div>Drop Audio</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#888', marginTop: '4px' }}>
                  {index + 1}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Sampler;

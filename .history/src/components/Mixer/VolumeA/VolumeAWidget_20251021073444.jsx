import React, { useCallback } from 'react';
import DraggableWidget from '../../DraggableWidget';
import VolumeA from './VolumeA';

const VolumeAWidget = ({ 
  value, 
  onChange, 
  x = 100, 
  y = 100, 
  width = 80, 
  height = 200,
  onDragEnd,
  onResizeEnd 
}) => {
  return (
    <DraggableWidget
      id="volumeA"
      title="Volume A"
      x={x}
      y={y}
      width={width}
      height={height}
      minSize={{ width: 80, height: 150 }}
      onDragEnd={onDragEnd}
      onResizeEnd={onResizeEnd}
      className="volume-a-widget"
    >
      <VolumeA 
        value={value}
        onChange={onChange}
      />
    </DraggableWidget>
  );
};

export default VolumeAWidget;
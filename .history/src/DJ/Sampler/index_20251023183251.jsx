import React, { useState } from 'react';
import SampleBrowser from './SampleBrowser';
import SamplePads from './SamplePads';
import './styles.css';

const Sampler = ({ audioManager }) => {
  const [samples, setSamples] = useState([]);

  return (
    <div className="sampler-container">
      <SampleBrowser onSampleLoaded={(sample) => {
        setSamples([...samples, sample]);
      }} />
      <SamplePads samples={samples} />
    </div>
  );
};

export default Sampler;
import React, { useState } from 'react';import React, { useState } from 'react';

import SampleBrowser from './SampleBrowser';import SampleBrowser from './SampleBrowser';

import SamplePads from './SamplePads';import SamplePads from './SamplePads';

import './styles.css';import './styles.css';



const Sampler = ({ audioManager }) => {const Sampler = ({ audioManager }) => {

  const [samples, setSamples] = useState([]);  const [samples, setSamples] = useState([]);



  return (  return (

    <div className="sampler-container">    <div className="sampler-container">

      <SampleBrowser onSampleLoaded={(sample) => {      <SampleBrowser onSampleLoaded={(sample) => {

        setSamples([...samples, sample]);        setSamples([...samples, sample]);

      }} />      }} />

      <SamplePads samples={samples} />      <SamplePads samples={samples} />

    </div>    </div>

  );  );

};};



export default Sampler;export default Sampler;
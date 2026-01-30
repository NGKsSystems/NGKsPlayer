import React, { useState } from 'react';import React, { useState } from 'react';import React, { useState } from 'react';

import SampleBrowser from './SampleBrowser';

import SamplePads from './SamplePads';import SampleBrowser from './SampleBrowser';import SampleBrowser from './SampleBrowser';

import './styles.css';

import SamplePads from './SamplePads';import SamplePads from './SamplePads';

const Sampler = ({ audioManager }) => {

  const [samples, setSamples] = useState([]);import './styles.css';import './styles.css';



  return (

    <div className="sampler-container">

      <SampleBrowser onSampleLoaded={(sample) => {const Sampler = ({ audioManager }) => {const Sampler = ({ audioManager }) => {

        setSamples([...samples, sample]);

      }} />  const [samples, setSamples] = useState([]);  const [samples, setSamples] = useState([]);

      <SamplePads samples={samples} />

    </div>

  );

};  return (  return (



export default Sampler;    <div className="sampler-container">    <div className="sampler-container">

      <SampleBrowser onSampleLoaded={(sample) => {      <SampleBrowser onSampleLoaded={(sample) => {

        setSamples([...samples, sample]);        setSamples([...samples, sample]);

      }} />      }} />

      <SamplePads samples={samples} />      <SamplePads samples={samples} />

    </div>    </div>

  );  );

};};



export default Sampler;export default Sampler;
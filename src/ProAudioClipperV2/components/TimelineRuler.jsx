/* ───────────────────────────────────────────────────────
   TimelineRuler – V2 time ruler strip
   Renders tick marks inside the ruler lane area.
   ─────────────────────────────────────────────────────── */
import React from 'react';
import { generateRulerTicks } from '../math/timelineMath.js';
import '../styles/timelineV2.css';

export default function TimelineRuler({ viewportStart = 0, viewportWidth = 800, zoom = 100 }) {
  const ticks = generateRulerTicks(viewportStart, viewportWidth, zoom);

  return (
    <>
      {ticks.map((tick, i) => (
        <div
          key={i}
          className={`v2-ruler-tick ${tick.major ? 'v2-ruler-tick--major' : 'v2-ruler-tick--minor'}`}
          style={{ left: tick.px }}
        >
          {tick.major && (
            <span className="v2-ruler-tick__label">{tick.label}</span>
          )}
        </div>
      ))}
    </>
  );
}

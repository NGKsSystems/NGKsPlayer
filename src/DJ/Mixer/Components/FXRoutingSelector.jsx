/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: FXRoutingSelector.jsx
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
import React from 'react';
import { GitBranch } from 'lucide-react';
import './FXRoutingSelector.css';

const FXRoutingSelector = ({ currentTarget = 'A', onTargetChange, availableTargets = ['A', 'B', 'C', 'D', 'MASTER'] }) => {
  return (
    <div className="fx-routing-selector">
      <div className="fx-routing-label">
        <GitBranch size={12} />
        <span>ROUTE TO</span>
      </div>
      <div className="fx-routing-options">
        {availableTargets.map(target => (
          <button
            key={target}
            className={`fx-routing-btn ${currentTarget === target ? 'active' : ''}`}
            onClick={() => onTargetChange(target)}
          >
            {target}
          </button>
        ))}
      </div>
    </div>
  );
};

export default FXRoutingSelector;


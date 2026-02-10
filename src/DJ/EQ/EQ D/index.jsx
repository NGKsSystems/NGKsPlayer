/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: index.jsx
 * Purpose: TODO â€“ describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
// EQ D - Just imports and re-exports EQ B with deck='D'
import EQB from '../EQ B';
import './styles.css';

const EQD = (props) => {
  return <EQB {...props} deck="D" />;
};

export default EQD;


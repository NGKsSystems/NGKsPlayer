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
// EQ C - Just imports and re-exports EQ A with deck='C'
import EQA from '../EQ A';
import './styles.css';

const EQC = (props) => {
  return <EQA {...props} deck="C" />;
};

export default EQC;


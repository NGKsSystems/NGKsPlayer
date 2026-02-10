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
// Library D - Just imports and re-exports Library B with deck='D'
import LibraryB from '../Library B';
import './styles.css';

const LibraryD = (props) => {
  return <LibraryB {...props} deck="D" />;
};

export default LibraryD;


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
/**
 * Reusable MenuItem component for context menus
 */
export const MenuItem = ({ children, onClick, disabled, danger }) => (
  <div
    className={`
      px-3 py-2 text-sm cursor-pointer hover:bg-gray-700 
      ${disabled ? 'opacity-50 cursor-not-allowed' : ''} 
      ${danger ? 'text-red-400 hover:bg-red-900/30' : 'text-gray-200'}
    `}
    onClick={disabled ? undefined : onClick}
  >
    {children}
  </div>
)


import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { createHashRouter, RouterProvider, useNavigate, useLocation } from "react-router-dom";

// CRITICAL: Bootstrap app initialization FIRST
import bootstrapAppInitialization from "./bootstrap/initBootstrap.js";
bootstrapAppInitialization();

// DEBUG: Global debugging object for troubleshooting
window.__DEBUG__ = {
  log: (msg) => console.log(`[DEBUG] ${msg}`),
  checkNav: () => {
    console.log('🔍 [DEBUG] Current URL:', window.location.href);
    console.log('🔍 [DEBUG] Hash:', window.location.hash);
    console.log('🔍 [DEBUG] Pathname:', window.location.pathname);
  },
  checkAPI: () => {
    console.log('🔍 [DEBUG] window.api exists?', !!window.api);
    if (window.api) {
      const methods = Object.keys(window.api);
      console.log('🔍 [DEBUG] Available IPC methods:', methods.length, 'methods');
      console.log(methods);
    } else {
      console.error('❌ window.api is NOT available!');
    }
  },
  checkComponent: () => {
    const root = document.getElementById('root');
    console.log('🔍 [DEBUG] #root element exists?', !!root);
    if (root) {
      console.log('🔍 [DEBUG] #root HTML:', root.innerHTML.substring(0, 200));
      console.log('🔍 [DEBUG] #root children:', root.children.length);
    }
  },
  navigateTo: (path) => {
    console.log(`🔍 [DEBUG] Attempting to navigate to ${path}`);
    window.location.hash = path;
  },
  getErrors: () => {
    const errors = window.__errors__ || [];
    console.log('🔍 [DEBUG] Stored errors:', errors);
    return errors;
  },
  help: () => {
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║               NGKsPlayer Debug Commands                        ║
╚════════════════════════════════════════════════════════════════╝

Available debug commands (type in console):

  __DEBUG__.checkNav()     → Check current navigation state
  __DEBUG__.checkAPI()     → Check if IPC bridge is available
  __DEBUG__.checkComponent() → Check if React root is mounted
  __DEBUG__.navigateTo('/player') → Navigate to a route
  __DEBUG__.getErrors()    → Get all logged errors
  __DEBUG__.log('msg')     → Log a debug message
  __DEBUG__.help()         → Show this help

Quick tests:
  window.api ? console.log('✅ IPC Ready') : console.log('❌ IPC Not Ready')
  document.querySelector('#root') ? console.log('✅ React Mounted') : console.log('❌ React Not Mounted')
    `);
  }
};

console.log('✅ DEBUG commands available! Type: __DEBUG__.help()');
window.__DEBUG__.help();

import "./styles.css";
import "./views/DJMixer.css";
import "./styles/theme-effects.css";
import "./styles/theme-overrides.css";

// Load Professional Audio Analysis Engine
import "./audio/professional-engine.js";

// Theme System
import { ThemeProvider } from "./contexts/ThemeContext.jsx";

import Library from "./views/library/Library.jsx";
import NowPlaying from "./views/player/NowPlaying.jsx";
import DJInterface from "./views/player/DJInterface.jsx";
import DJProfessional from "./views/player/DJProfessional.jsx";
import DJSimple from "./views/player/DJSimple.jsx";
import FourDeckDJ from "./views/player/FourDeckDJ.jsx";
import TagEditor from "./views/library/TagEditor.jsx";
import Settings from "./views/settings/Settings.jsx";
import SettingsHome from "./views/settings/SettingsHome.jsx";
import ThemeSettings from "./views/settings/ThemeSettings.jsx";
import LayerRemover from "./views/player/LayerRemover.jsx";
import ProAudioClipper from "./ProAudioClipper/ProAudioClipper.jsx";
import Broadcast from "./views/broadcast/Broadcast.jsx";
import StreamingInterface from "./streaming/StreamingInterface.jsx";
import HardwareIntegration from "./hardware/HardwareIntegration.jsx";
import AnalyzerSettingsPage from "./views/settings/AnalyzerSettingsPage.jsx";
import ErrorBoundary from "./DJ/Mixer/Common/ErrorBoundary";
import AppWithSplash from "./AppWithSplash.jsx";

// Wrapper component to provide navigation to child components
function NavigationWrapper({ children }) {
  console.log('🔥 [NavigationWrapper] Rendering with children:', children?.type?.name || 'unknown');
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    console.log('🔥 [NavigationWrapper] Location changed to:', location.pathname, location.hash);
  }, [location]);
  
  
  useEffect(() => {
    // Check for autoplay after refresh
    const autoplayRoute = sessionStorage.getItem('ngks_autoplay_route');
    if (autoplayRoute) {
      console.log('💥 Auto-navigating to:', autoplayRoute);
      sessionStorage.removeItem('ngks_autoplay_route');
      navigate(autoplayRoute);
    }
  }, [navigate]);
  
  const handleNavigate = (route) => {
    const routeMap = {
      'library': '/',
      'player': '/player',
      'dj': '/now',
      '4deck': '/4deck',
      'tags': '/tags',
      'settings': '/settings',
      'analyzerSettings': '/analyzer-settings',
      'layer-remover': '/layer-remover',
      'clipper': '/clipper',
      'streaming': '/streaming',
      'hardware': '/hardware'
    };
    const resolved = routeMap[route] || '/';
    console.log(`🔁 [NavigationWrapper] handleNavigate called. route='${route}', resolved='${resolved}'`);
    navigate(resolved);
  };
  
  return (
    <ErrorBoundary>
      {React.cloneElement(children, { onNavigate: handleNavigate })}
    </ErrorBoundary>
  );
}

const router = createHashRouter([
  { 
    path: "/", 
    element: <NavigationWrapper><Library /></NavigationWrapper>,
    errorElement: <ErrorBoundary><div className="p-8 text-white">Route Error: Library</div></ErrorBoundary>
  },
  { 
    path: "/player", 
    element: <NavigationWrapper><NowPlaying /></NavigationWrapper>,
    errorElement: <ErrorBoundary><div className="p-8 text-white">Route Error: Player</div></ErrorBoundary>
  },
  { 
    path: "/now", 
    element: <NavigationWrapper><DJSimple /></NavigationWrapper>,
    errorElement: <ErrorBoundary><div className="p-8 text-white">Route Error: DJ Mode</div></ErrorBoundary>
  },
  { 
    path: "/4deck", 
    element: <NavigationWrapper><FourDeckDJ /></NavigationWrapper>,
    errorElement: <ErrorBoundary><div className="p-8 text-white">Route Error: 4-Deck DJ</div></ErrorBoundary>
  },
  { 
    path: "/tags", 
    element: <NavigationWrapper><TagEditor /></NavigationWrapper>,
    errorElement: <ErrorBoundary><div className="p-8 text-white">Route Error: Tag Editor</div></ErrorBoundary>
  },
  { 
    path: "/tagedit/:id", 
    element: <NavigationWrapper><TagEditor /></NavigationWrapper>,
    errorElement: <ErrorBoundary><div className="p-8 text-white">Route Error: Tag Editor</div></ErrorBoundary>
  },
  { 
    path: "/settings", 
    element: <NavigationWrapper><SettingsHome /></NavigationWrapper>,
    errorElement: <ErrorBoundary><div className="p-8 text-white">Route Error: Settings</div></ErrorBoundary>
  },
  {
    path: "/settings/app",
    element: <NavigationWrapper><Settings /></NavigationWrapper>,
    errorElement: <ErrorBoundary><div className="p-8 text-white">Route Error: App Settings</div></ErrorBoundary>
  },
  {
    path: "/settings/themes",
    element: <NavigationWrapper><ThemeSettings /></NavigationWrapper>,
    errorElement: <ErrorBoundary><div className="p-8 text-white">Route Error: Theme Settings</div></ErrorBoundary>
  },
  {
    path: "/analyzer-settings",
    element: <NavigationWrapper><AnalyzerSettingsPage /></NavigationWrapper>,
    errorElement: <ErrorBoundary><div className="p-8 text-white">Route Error: Analyzer Settings</div></ErrorBoundary>
  },
  { 
    path: "/layer-remover", 
    element: <NavigationWrapper><LayerRemover /></NavigationWrapper>,
    errorElement: <ErrorBoundary><div className="p-8 text-white">Route Error: Layer Remover</div></ErrorBoundary>
  },
  { 
    path: "/clipper", 
    element: <NavigationWrapper><ProAudioClipper /></NavigationWrapper>,
    errorElement: <ErrorBoundary><div className="p-8 text-white">Route Error: Pro Clipper</div></ErrorBoundary>
  },
  { 
    path: "/broadcast", 
    element: <Broadcast />,
    errorElement: <ErrorBoundary><div className="p-8 text-white">Route Error: Broadcast</div></ErrorBoundary>
  },
  { 
    path: "/streaming", 
    element: <NavigationWrapper><StreamingInterface /></NavigationWrapper>,
    errorElement: <ErrorBoundary><div className="p-8 text-white">Route Error: Streaming</div></ErrorBoundary>
  },
  { 
    path: "/hardware", 
    element: <NavigationWrapper><HardwareIntegration /></NavigationWrapper>,
    errorElement: <ErrorBoundary><div className="p-8 text-white">Route Error: Hardware</div></ErrorBoundary>
  },
  { 
    path: "/nowplaying", 
    element: <NavigationWrapper><NowPlaying /></NavigationWrapper>,
    errorElement: <ErrorBoundary><div className="p-8 text-white">Route Error: Now Playing</div></ErrorBoundary>
  },
  {
    path: "*",
    element: <NavigationWrapper><Library /></NavigationWrapper>,
    errorElement: <ErrorBoundary><div className="p-8 text-white">Route Error: Fallback</div></ErrorBoundary>
  }
]);

createRoot(document.getElementById("root")).render(
  <ErrorBoundary>
    <ThemeProvider>
      <AppWithSplash>
        <RouterProvider router={router} />
      </AppWithSplash>
    </ThemeProvider>
  </ErrorBoundary>
);

/// <reference types="vite/client" />

interface GhostframeAPI {
  // AI Service
  ai: {
    initialize: (config: any) => Promise<any>;
    sendMessage: (message: string) => Promise<any>;
    sendAudio: (audioData: any) => Promise<any>;
    sendScreenshot: (imageData: string) => Promise<any>;
  };

  // Automation Service
  automation: {
    startSession: () => Promise<any>;
    stopSession: () => Promise<any>;
    executeAction: (action: any) => Promise<any>;
  };

  // Capture Service
  capture: {
    startAudio: () => Promise<any>;
    stopAudio: () => Promise<any>;
    startPeriodicScreenshots: (interval: number) => Promise<any>;
    stopPeriodicScreenshots: () => Promise<any>;
    takeScreenshot: () => Promise<any>;
  };

  // Window Management
  window: {
    toggleVisibility: () => Promise<any>;
    setMode: (mode: string) => Promise<any>;
    toggleClickThrough: () => Promise<any>;
  };

  // System
  system: {
    quit: () => Promise<any>;
  };

  // Settings
  settings: {
    save: (settings: any) => Promise<any>;
    load: () => Promise<any>;
  };

  // Event handling
  on: (channel: string, callback: (...args: any[]) => void) => void;
  off: (channel: string, callback: (...args: any[]) => void) => void;
  send: (channel: string, ...args: any[]) => void;
}

declare global {
  interface Window {
    ghostframe: GhostframeAPI;
  }
}
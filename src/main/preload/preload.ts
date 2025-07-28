const { contextBridge, ipcRenderer } = require("electron");

// Define the API that will be exposed to the renderer process
export interface GhostframeAPI {
  // AI Service
  ai: {
    initialize: (config: any) => Promise<any>;
    sendMessage: (message: string) => Promise<any>;
    sendAudio: (audioData: string) => Promise<any>;
    sendScreenshot: (imageData: string) => Promise<any>;
  };

  // Browser Automation
  automation: {
    executeAction: (action: any) => Promise<any>;
    startSession: (config?: any) => Promise<any>;
    stopSession: () => Promise<any>;
  };

  // Capture Services
  capture: {
    startAudio: () => Promise<any>;
    stopAudio: () => Promise<any>;
    takeScreenshot: (options?: any) => Promise<any>;
    startPeriodicScreenshots: (interval: number) => Promise<any>;
    stopPeriodicScreenshots: () => Promise<any>;
  };

  // Window Management
  window: {
    toggleVisibility: () => Promise<any>;
    toggleClickThrough: () => Promise<any>;
    setMode: (mode: "overlay" | "automation") => Promise<any>;
  };

  // System
  system: {
    openExternal: (url: string) => Promise<any>;
    quit: () => Promise<any>;
  };

  // Events
  on: (channel: string, callback: (...args: any[]) => void) => void;
  off: (channel: string, callback: (...args: any[]) => void) => void;
  send: (channel: string, ...args: any[]) => void;

  // Utility
  getVersion: () => string;
  getPlatform: () => string;
}

// Create the API object
const ghostframeAPI: GhostframeAPI = {
  ai: {
    initialize: (config) => ipcRenderer.invoke("ai:initialize", config),
    sendMessage: (message) => ipcRenderer.invoke("ai:sendMessage", message),
    sendAudio: (audioData) => ipcRenderer.invoke("ai:sendAudio", audioData),
    sendScreenshot: (imageData) =>
      ipcRenderer.invoke("ai:sendScreenshot", imageData),
  },

  automation: {
    executeAction: (action) =>
      ipcRenderer.invoke("automation:executeAction", action),
    startSession: (config) =>
      ipcRenderer.invoke("automation:startSession", config),
    stopSession: () => ipcRenderer.invoke("automation:stopSession"),
  },

  capture: {
    startAudio: () => ipcRenderer.invoke("capture:startAudio"),
    stopAudio: () => ipcRenderer.invoke("capture:stopAudio"),
    takeScreenshot: (options) =>
      ipcRenderer.invoke("capture:takeScreenshot", options),
    startPeriodicScreenshots: (interval) =>
      ipcRenderer.invoke("capture:startPeriodicScreenshots", interval),
    stopPeriodicScreenshots: () =>
      ipcRenderer.invoke("capture:stopPeriodicScreenshots"),
  },

  window: {
    toggleVisibility: () => ipcRenderer.invoke("window:toggleVisibility"),
    toggleClickThrough: () => ipcRenderer.invoke("window:toggleClickThrough"),
    setMode: (mode) => ipcRenderer.invoke("window:setMode", mode),
  },

  system: {
    openExternal: (url) => ipcRenderer.invoke("system:openExternal", url),
    quit: () => ipcRenderer.invoke("system:quit"),
  },

  on: (channel, callback) => {
    // Validate allowed channels for security
    const validChannels = [
      "ai-response",
      "click-through-toggled",
      "mode-changed",
      "trigger-answer",
      "trigger-automation",
      "audio-data",
      "screenshot-data",
      "automation-progress",
      "status-update",
    ];

    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, callback);
    }
  },

  off: (channel, callback) => {
    ipcRenderer.removeListener(channel, callback);
  },

  send: (channel, ...args) => {
    // Validate allowed send channels
    const validSendChannels = ["shortcuts:updateKeybinds"];

    if (validSendChannels.includes(channel)) {
      ipcRenderer.send(channel, ...args);
    }
  },

  getVersion: () => {
    return process.env.npm_package_version || "1.0.0";
  },

  getPlatform: () => {
    return process.platform;
  },
};

// Remove Node.js global variables for security
delete (global as any).process;
delete (global as any).Buffer;

// Override navigator.webdriver for stealth
try {
  Object.defineProperty(navigator, "webdriver", {
    get: () => undefined,
  });
} catch (e) {
  // Ignore if already defined
}

console.log("🔧 Preload script running...");
console.log("🔧 About to expose Ghostframe API");

// Expose the API to the renderer process
contextBridge.exposeInMainWorld("ghostframe", ghostframeAPI);

console.log("✅ Ghostframe API exposed to window.ghostframe");
console.log("🔧 Available API methods:", Object.keys(ghostframeAPI));

// Add some additional security measures
window.addEventListener("DOMContentLoaded", () => {
  // Remove any traces of Node.js from the renderer
  delete (window as any).require;
  delete (window as any).exports;
  delete (window as any).module;

  // Add a custom user agent to help with stealth
  Object.defineProperty(navigator, "webdriver", {
    get: () => undefined,
  });
});

// Export types for TypeScript
export type GhostframeAPIType = typeof ghostframeAPI;

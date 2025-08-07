const { contextBridge, ipcRenderer } = require("electron");

export interface GhostframeAPI {
  ai: {
    initialize: (config: any) => Promise<any>;
    sendMessage: (message: string) => Promise<any>;
    sendAudio: (audioData: string) => Promise<any>;
    sendScreenshot: (imageData: string) => Promise<any>;
    getStoredConfig: () => Promise<any>;
  };

  automation: {
    executeAction: (action: any) => Promise<any>;
    startSession: (config?: any) => Promise<any>;
    stopSession: () => Promise<any>;
  };

  capture: {
    startAudio: () => Promise<any>;
    stopAudio: () => Promise<any>;
    takeScreenshot: (options?: any) => Promise<any>;
    startPeriodicScreenshots: (interval: number) => Promise<any>;
    stopPeriodicScreenshots: () => Promise<any>;
  };

  window: {
    toggleVisibility: () => Promise<any>;
    toggleClickThrough: () => Promise<any>;
    setMode: (mode: "overlay" | "automation") => Promise<any>;
  };

  system: {
    openExternal: (url: string) => Promise<any>;
    quit: () => Promise<any>;
  };

  on: (channel: string, callback: (...args: any[]) => void) => void;
  off: (channel: string, callback: (...args: any[]) => void) => void;
  send: (channel: string, ...args: any[]) => void;

  getVersion: () => string;
  getPlatform: () => string;
}

const ghostframeAPI: GhostframeAPI = {
  ai: {
    initialize: (config) => ipcRenderer.invoke("ai:initialize", config),
    sendMessage: (message) => ipcRenderer.invoke("ai:sendMessage", message),
    sendAudio: (audioData) => ipcRenderer.invoke("ai:sendAudio", audioData),
    sendScreenshot: (imageData) =>
      ipcRenderer.invoke("ai:sendScreenshot", imageData),
    getStoredConfig: () => ipcRenderer.invoke("ai:getStoredConfig"),
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
      "log-message",
    ];

    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (_event: any, ...args: any) => callback(...args));
    }
  },

  off: (channel, callback) => {
    ipcRenderer.removeListener(channel, callback as any);
  },

  send: (channel, ...args) => {
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

delete (global as any).process;
delete (global as any).Buffer;

try {
  Object.defineProperty(navigator, "webdriver", {
    get: () => undefined,
  });
} catch (e) {
  // Ignore if already defined
}

console.log("🔧 Preload script running...");
console.log("🔧 About to expose Ghostframe API");

contextBridge.exposeInMainWorld("ghostframe", ghostframeAPI);

console.log("✅ Ghostframe API exposed to window.ghostframe");
console.log("🔧 Available API methods:", Object.keys(ghostframeAPI));

window.addEventListener("DOMContentLoaded", () => {
  delete (window as any).require;
  delete (window as any).exports;
  delete (window as any).module;

  Object.defineProperty(navigator, "webdriver", {
    get: () => undefined,
  });
});

process.on("uncaughtException", (error) => {
  console.error("Preload script error:", error);
});

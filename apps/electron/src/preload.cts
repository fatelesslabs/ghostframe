const { contextBridge, ipcRenderer, clipboard } = require("electron");

// Define the API that will be exposed to the renderer process
export interface GhostframeAPI {
  // AI Service
  ai: {
    initialize: (config: any) => Promise<any>;
    sendMessage: (message: string) => Promise<any>;
    sendAudio: (audioData: string) => Promise<any>;
    sendScreenshot: (imageData: string) => Promise<any>;
    getStoredConfig: () => Promise<any>;
    setVerbosity?: (level: "short" | "verbose") => Promise<any>;
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
    enableTranscription: (enabled: boolean) => Promise<any>;
    getAudioDevices: () => Promise<any>;
    takeScreenshot: (options?: any) => Promise<any>;
    startPeriodicScreenshots: (interval: number) => Promise<any>;
    stopPeriodicScreenshots: () => Promise<any>;
  };

  // Window Management
  window: {
    toggleVisibility: () => Promise<any>;
    toggleClickThrough: () => Promise<any>;
    toggleContentProtection: () => Promise<any>;
    getContentProtectionStatus: () => Promise<any>;
    move: (deltaX: number, deltaY: number) => Promise<any>;
    setPosition: (x: number, y: number) => Promise<any>;
    getPosition: () => Promise<any>;
    setMode: (mode: "overlay" | "automation") => Promise<any>;
  };

  // System
  system: {
    openExternal: (url: string) => Promise<any>;
    quit: () => Promise<any>;
  };

  // Settings
  settings: {
    save: (settings: any) => Promise<void>;
    get: () => Promise<any>;
  };

  // Clipboard
  clipboard: {
    writeText: (text: string) => void;
    readText: () => string;
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
const listenerMap = new Map<string, Map<Function, Function>>(); // channel -> (callback -> wrapper)

const ghostframeAPI: GhostframeAPI = {
  ai: {
    initialize: (config) => ipcRenderer.invoke("ai:initialize", config),
    sendMessage: (message) => ipcRenderer.invoke("ai:sendMessage", message),
    sendAudio: (audioData) => ipcRenderer.invoke("ai:sendAudio", audioData),
    sendScreenshot: (imageData) =>
      ipcRenderer.invoke("ai:sendScreenshot", imageData),
    getStoredConfig: () => ipcRenderer.invoke("ai:getStoredConfig"),
    setVerbosity: (level) => ipcRenderer.invoke("ai:setVerbosity", level),
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
    enableTranscription: (enabled: boolean) =>
      ipcRenderer.invoke("capture:enableTranscription", enabled),
    getAudioDevices: () => ipcRenderer.invoke("capture:getAudioDevices"),
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
    toggleContentProtection: () =>
      ipcRenderer.invoke("window:toggleContentProtection"),
    getContentProtectionStatus: () =>
      ipcRenderer.invoke("window:getContentProtectionStatus"),
    move: (deltaX, deltaY) => ipcRenderer.invoke("window:move", deltaX, deltaY),
    setPosition: (x, y) => ipcRenderer.invoke("window:setPosition", x, y),
    getPosition: () => ipcRenderer.invoke("window:getPosition"),
    setMode: (mode) => ipcRenderer.invoke("window:setMode", mode),
  },

  system: {
    openExternal: (url) => ipcRenderer.invoke("system:openExternal", url),
    quit: () => ipcRenderer.invoke("system:quit"),
  },

  settings: {
    save: (settings) => ipcRenderer.invoke("settings:save", settings),
    get: () => ipcRenderer.invoke("settings:get"),
  },

  clipboard: {
    writeText: (text: string) => clipboard.writeText(text),
    readText: () => clipboard.readText(),
  },

  on: (channel, callback) => {
    // Validate allowed channels for security
    const validChannels = [
      "ai-response",
      "ai-status",
      "click-through-toggled",
      "content-protection-toggled",
      "transcription-update",
      "new-transcription-conversation",
      "update-response",
      "conversation-turn-saved",
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
      console.log(`Registering listener for channel: ${channel}`);

      // Create wrapper function
      const wrapper = (event: any, ...args: any[]) => {
        console.log(`Preload received ${channel} with args:`, args);
        // Pass the event object as first parameter, then the data
        if (args.length === 1) {
          console.log(
            `Passing event and single arg to callback:`,
            event,
            args[0]
          );
          callback(event, args[0]);
        } else {
          console.log(
            `Passing event and multiple args to callback:`,
            event,
            args
          );
          callback(event, ...args);
        }
      };

      // Store the wrapper for later removal
      if (!listenerMap.has(channel)) {
        listenerMap.set(channel, new Map());
      }
      listenerMap.get(channel)!.set(callback, wrapper);

      ipcRenderer.on(channel, wrapper);
    }
  },

  off: (channel, callback) => {
    console.log(`Removing listener for channel: ${channel}`);
    const channelMap = listenerMap.get(channel);
    if (channelMap && channelMap.has(callback)) {
      const wrapper = channelMap.get(callback)!;
      ipcRenderer.removeListener(channel, wrapper);
      channelMap.delete(callback);
      console.log(`Successfully removed listener for channel: ${channel}`);
    } else {
      console.warn(`No listener found for channel: ${channel}`);
    }
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
  if (!Object.getOwnPropertyDescriptor(navigator, "webdriver")) {
    Object.defineProperty(navigator, "webdriver", {
      get: () => undefined,
      configurable: true,
    });
  }
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

  // Add a custom user agent to help with stealth (skip if already defined)
  try {
    if (!Object.getOwnPropertyDescriptor(navigator, "webdriver")) {
      Object.defineProperty(navigator, "webdriver", {
        get: () => undefined,
        configurable: true,
      });
    }
  } catch (e) {
    // Ignore if already defined
  }
});

// Log any errors that occur during preload
process.on("uncaughtException", (error) => {
  console.error("Preload script error:", error);
});

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
    enableTranscription: (enabled: boolean) => Promise<any>;
    takeScreenshot: (options?: any) => Promise<any>;
    startPeriodicScreenshots: (interval: number) => Promise<any>;
    stopPeriodicScreenshots: () => Promise<any>;
  };

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
    enableTranscription: (enabled: boolean) =>
      ipcRenderer.invoke("capture:enableTranscription", enabled),
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

  on: (channel, callback) => {
    const validChannels = [
      "ai-response",
      "ai-status",
      "click-through-toggled",
      "content-protection-toggled",
      "transcription-update",
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

//(new) main.ts

import {
  app,
  BrowserWindow,
  ipcMain,
  desktopCapturer,
  globalShortcut,
} from "electron";
import path from "path";
import { isDev } from "./utils.js";
import { getPreloadPath } from "./pathResolver.js";
import { AIService } from "./services/AIService.js";
import { BrowserAutomationService } from "./services/BrowserAutomationService.js";
import { AudioCaptureService } from "./services/AudioCaptureService.js";
import { ScreenshotService } from "./services/ScreenshotService.js";
import { ProcessRandomizer } from "./services/ProcessRandomizer.js";
import { StealthWindowManager } from "./services/StealthWindowManager.js";
import { AntiAnalysisService } from "./services/AntiAnalysisService.js";
import { SettingsService } from "./services/SettingsService.js";
import Store from "electron-store";

const store = new Store();

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.

let mainWindow: BrowserWindow | null;
let isClickThrough = false;

// Instantiate services
const processRandomizer = new ProcessRandomizer();
const aiService = new AIService();
const automationService = new BrowserAutomationService();
const audioCaptureService = new AudioCaptureService();
const screenshotService = new ScreenshotService();
const stealthWindowManager = new StealthWindowManager(processRandomizer);
const antiAnalysisService = new AntiAnalysisService();
const settingsService = new SettingsService();

async function createWindow() {
  await antiAnalysisService.applyAntiAnalysisMeasures();

  mainWindow = await stealthWindowManager.createStealthWindow(
    isDev(),
    getPreloadPath()
  );

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // Set initial process title for stealth
  processRandomizer.regenerateRandomNames();
}

app.on("ready", () => {
  createWindow();
  settingsService.initialize();

  // Register global shortcuts
  globalShortcut.register("CommandOrControl+Shift+C", () => {
    toggleClickThrough();
  });

  // Window movement shortcuts
  globalShortcut.register("CommandOrControl+Up", () => {
    moveWindow(0, -20);
  });

  globalShortcut.register("CommandOrControl+Down", () => {
    moveWindow(0, 20);
  });

  globalShortcut.register("CommandOrControl+Left", () => {
    moveWindow(-20, 0);
  });

  globalShortcut.register("CommandOrControl+Right", () => {
    moveWindow(20, 0);
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on("will-quit", () => {
  // Unregister all shortcuts.
  globalShortcut.unregisterAll();
});

// --- IPC Handlers for ghostframe API ---

// Helper function to toggle click-through
const toggleClickThrough = () => {
  isClickThrough = !isClickThrough;
  mainWindow?.setIgnoreMouseEvents(isClickThrough, { forward: true });
  // Notify the renderer process of the change
  mainWindow?.webContents.send("click-through-toggled", isClickThrough);
};

// Helper function to move window
const moveWindow = (deltaX: number, deltaY: number) => {
  if (mainWindow) {
    const [currentX, currentY] = mainWindow.getPosition();
    mainWindow.setPosition(currentX + deltaX, currentY + deltaY);
  }
};

// Window Management
ipcMain.handle("window:toggleVisibility", () => {
  if (mainWindow) {
    mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
  }
});
ipcMain.handle("window:toggleClickThrough", toggleClickThrough);
ipcMain.handle("window:move", (_event, deltaX: number, deltaY: number) => {
  moveWindow(deltaX, deltaY);
});
ipcMain.handle("window:setPosition", (_event, x: number, y: number) => {
  if (mainWindow) {
    mainWindow.setPosition(x, y);
  }
});
ipcMain.handle("window:getPosition", () => {
  if (mainWindow) {
    return mainWindow.getPosition();
  }
  return [0, 0];
});
ipcMain.handle("system:quit", () => app.quit());

// AI Service
ipcMain.handle("ai:initialize", async (_event, config) => {
  const result = await aiService.initialize(config);
  mainWindow?.webContents.send(
    "log-message",
    result.success
      ? `AI initialized with ${config.provider}`
      : `AI init failed: ${result.error}`
  );
  return result;
});

ipcMain.handle("ai:sendMessage", async (_event, message) => {
  // The AI service's onmessage callback will send the actual response to the renderer
  // via the 'ai-response' channel. Here, we just invoke the send method and
  // return its initial status.
  return await aiService.sendMessage(message);
});

ipcMain.handle("ai:getStoredConfig", () => {
  return aiService.getStoredConfig();
});

ipcMain.handle("ai:sendAudio", async (_event, audioData) => {
  return await aiService.sendAudio(audioData);
});

ipcMain.handle("ai:sendScreenshot", async (_event, imageData) => {
  return await aiService.sendScreenshot(imageData);
});

// Capture Service
ipcMain.handle("capture:startAudio", async () => {
  const result = await audioCaptureService.startCapture();
  mainWindow?.webContents.send(
    "log-message",
    result.success
      ? "Audio capture started."
      : `Audio capture failed: ${result.error}`
  );
  return result;
});

ipcMain.handle("capture:stopAudio", async () => {
  const result = await audioCaptureService.stopCapture();
  mainWindow?.webContents.send("log-message", "Audio capture stopped.");
  return result;
});

ipcMain.handle(
  "capture:enableTranscription",
  async (_event, enabled: boolean) => {
    audioCaptureService.enableTranscription(enabled);
    if (enabled) {
      // Set up transcription callback to send to renderer
      audioCaptureService.setTranscriptionCallback((text: string) => {
        mainWindow?.webContents.send("transcription-update", text);
      });
    }
    return { success: true };
  }
);
ipcMain.handle("capture:takeScreenshot", async () => {
  const result = await screenshotService.takeScreenshot();
  if (result.success && result.data) {
    await aiService.sendScreenshot(result.data);
  }
  mainWindow?.webContents.send(
    "log-message",
    result.success
      ? "Screenshot captured and sent to AI."
      : `Screenshot failed: ${result.error}`
  );
  return result;
});

ipcMain.handle("capture:startPeriodicScreenshots", async (event, interval) => {
  return await screenshotService.startPeriodicCapture(interval);
});

ipcMain.handle("capture:stopPeriodicScreenshots", async (event) => {
  return await screenshotService.stopPeriodicCapture();
});

// Automation Service
ipcMain.handle("automation:startSession", async (_event, config) => {
  const result = await automationService.startSession(config);
  mainWindow?.webContents.send(
    "log-message",
    result.success
      ? "Automation session started."
      : `Automation failed: ${result.error}`
  );
  return result;
});
ipcMain.handle("automation:stopSession", async () => {
  const result = await automationService.stopSession();
  mainWindow?.webContents.send("log-message", "Automation session stopped.");
  return result;
});
ipcMain.handle("automation:executeAction", async (_event, action) => {
  const result = await automationService.executeAction(action);
  mainWindow?.webContents.send(
    "log-message",
    `Executed action: ${action.type}`
  );
  return result;
});

// Stealth/Process Randomizer/Window Mode
ipcMain.handle("window:setMode", async (_event, mode) => {
  if (mainWindow) {
    return await stealthWindowManager.setMode(mainWindow, mode);
  }
  return { success: false, error: "Main window not found" };
});

ipcMain.handle("window:toggleContentProtection", async () => {
  if (mainWindow) {
    return await stealthWindowManager.toggleContentProtection(mainWindow);
  }
  return { success: false, enabled: false, error: "Main window not found" };
});

ipcMain.handle("window:getContentProtectionStatus", async () => {
  return { enabled: stealthWindowManager.isContentProtectionEnabled() };
});

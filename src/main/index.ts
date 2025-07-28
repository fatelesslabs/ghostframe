const { app: electronApp, BrowserWindow, shell, ipcMain } = require("electron");

import { StealthWindowManager } from "./stealth/StealthWindowManager";
import { AntiAnalysisService } from "./stealth/AntiAnalysisService";
import { ProcessRandomizer } from "./stealth/ProcessRandomizer";
import { AIService } from "./ai/AIService";
import { BrowserAutomationService } from "./automation/BrowserAutomationService";
import { AudioCaptureService } from "./capture/AudioCaptureService";
import { ScreenshotService } from "./capture/ScreenshotService";

if (require("electron-squirrel-startup")) {
  process.exit(0);
}

let mainWindow: typeof BrowserWindow | null = null;
let stealthWindowManager: StealthWindowManager;
let aiService: AIService;
let browserAutomationService: BrowserAutomationService;
let audioCaptureService: AudioCaptureService;
let screenshotService: ScreenshotService;

// Initialize random process names for stealth
const processRandomizer = new ProcessRandomizer();
const antiAnalysisService = new AntiAnalysisService();

async function createMainWindow(): Promise<void> {
  // Apply anti-analysis measures with random delay
  await antiAnalysisService.applyAntiAnalysisMeasures();

  // Initialize stealth window manager
  stealthWindowManager = new StealthWindowManager(processRandomizer);
  mainWindow = await stealthWindowManager.createStealthWindow();

  // Initialize services
  aiService = new AIService();
  browserAutomationService = new BrowserAutomationService();
  audioCaptureService = new AudioCaptureService();
  screenshotService = new ScreenshotService();

  // Setup IPC handlers
  setupIpcHandlers();

  // DON'T apply stealth measures on startup - let window be visible by default
  // stealthWindowManager.applyStealthMeasures(mainWindow);
  // stealthWindowManager.startTitleRandomization(mainWindow);

  console.log("Ghostframe started - window should be visible");
}

function setupIpcHandlers(): void {
  // AI Service handlers
  ipcMain.handle("ai:initialize", async (event, config) => {
    return await aiService.initialize(config);
  });

  ipcMain.handle("ai:sendMessage", async (event, message) => {
    return await aiService.sendMessage(message);
  });

  ipcMain.handle("ai:sendAudio", async (event, audioData) => {
    return await aiService.sendAudio(audioData);
  });

  ipcMain.handle("ai:sendScreenshot", async (event, imageData) => {
    return await aiService.sendScreenshot(imageData);
  });

  // Browser Automation handlers
  ipcMain.handle("automation:executeAction", async (event, action) => {
    return await browserAutomationService.executeAction(action);
  });

  ipcMain.handle("automation:startSession", async (event, config) => {
    return await browserAutomationService.startSession(config);
  });

  ipcMain.handle("automation:stopSession", async (event) => {
    return await browserAutomationService.stopSession();
  });

  // Capture Service handlers
  ipcMain.handle("capture:startAudio", async (event) => {
    return await audioCaptureService.startCapture();
  });

  ipcMain.handle("capture:stopAudio", async (event) => {
    return await audioCaptureService.stopCapture();
  });

  ipcMain.handle("capture:takeScreenshot", async (event, options) => {
    return await screenshotService.takeScreenshot(options);
  });

  ipcMain.handle(
    "capture:startPeriodicScreenshots",
    async (event, interval) => {
      return await screenshotService.startPeriodicCapture(interval);
    }
  );

  ipcMain.handle("capture:stopPeriodicScreenshots", async (event) => {
    return await screenshotService.stopPeriodicCapture();
  });

  // Window management handlers
  ipcMain.handle("window:toggleVisibility", async (event) => {
    return await stealthWindowManager.toggleVisibility(mainWindow!);
  });

  ipcMain.handle("window:toggleClickThrough", async (event) => {
    return await stealthWindowManager.toggleClickThrough(mainWindow!);
  });

  ipcMain.handle(
    "window:setMode",
    async (event, mode: "overlay" | "automation") => {
      return await stealthWindowManager.setMode(mainWindow!, mode);
    }
  );

  // System handlers
  ipcMain.handle("system:openExternal", async (event, url) => {
    try {
      await shell.openExternal(url);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle("system:quit", async (event) => {
    try {
      // Cleanup services before quitting
      await aiService?.cleanup();
      await browserAutomationService?.cleanup();
      await audioCaptureService?.cleanup();
      await screenshotService?.cleanup();

      electronApp.quit();
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Global shortcut handlers
  ipcMain.on("shortcuts:updateKeybinds", (event, keybinds) => {
    stealthWindowManager.updateGlobalShortcuts(
      keybinds,
      mainWindow!,
      aiService,
      browserAutomationService
    );
  });
}

// App event handlers
electronApp.whenReady().then(createMainWindow);

electronApp.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electronApp.quit();
  }
});

electronApp.on("before-quit", async () => {
  // Cleanup all services
  await aiService?.cleanup();
  await browserAutomationService?.cleanup();
  await audioCaptureService?.cleanup();
  await screenshotService?.cleanup();
});

electronApp.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

// Handle certificate errors for automation
electronApp.on(
  "certificate-error",
  (event, webContents, url, error, certificate, callback) => {
    // Allow all certificates for automation purposes
    event.preventDefault();
    callback(true);
  }
);

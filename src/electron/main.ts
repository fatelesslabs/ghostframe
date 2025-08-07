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
import Store from "electron-store";

const store = new Store();

let mainWindow: BrowserWindow | null;
let isClickThrough = false;

const processRandomizer = new ProcessRandomizer();
const aiService = new AIService();
const automationService = new BrowserAutomationService();
const audioCaptureService = new AudioCaptureService();
const screenshotService = new ScreenshotService();
const stealthWindowManager = new StealthWindowManager(processRandomizer);
const antiAnalysisService = new AntiAnalysisService();

async function createWindow() {
  await antiAnalysisService.applyAntiAnalysisMeasures();

  mainWindow = await stealthWindowManager.createStealthWindow(
    isDev(),
    getPreloadPath()
  );

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  processRandomizer.regenerateRandomNames();
}

app.on("ready", () => {
  createWindow();

  globalShortcut.register("CommandOrControl+Shift+C", () => {
    toggleClickThrough();
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
  globalShortcut.unregisterAll();
});

const toggleClickThrough = () => {
  isClickThrough = !isClickThrough;
  mainWindow?.setIgnoreMouseEvents(isClickThrough, { forward: true });
  mainWindow?.webContents.send("click-through-toggled", isClickThrough);
};

ipcMain.handle("window:toggleVisibility", () => {
  if (mainWindow) {
    mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
  }
});
ipcMain.handle("window:toggleClickThrough", toggleClickThrough);
ipcMain.handle("system:quit", () => app.quit());

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

ipcMain.handle("ai:sendMessage", async (_event, { message }) => {
  const result = await aiService.sendMessage(message);
  mainWindow?.webContents.send("ai-response", result);
  return result;
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
ipcMain.handle("window:setMode", async (_event, mode) => {
  if (mainWindow) {
    return await stealthWindowManager.setMode(mainWindow, mode);
  }
  return { success: false, error: "Main window not found" };
});

ipcMain.handle("settings:save", (_event, settings) => {
  console.log("Saving settings:", settings);
  mainWindow?.webContents.send("log-message", "Settings saved successfully!");
  return { success: true };
});

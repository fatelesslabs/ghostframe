// Migrated StealthWindowManager for new Electron/React setup
import { BrowserWindow, globalShortcut, screen, app } from "electron";
import * as path from "path";
import { ProcessRandomizer } from "./ProcessRandomizer.js";
import { AIService } from "./AIService.js";
import { BrowserAutomationService } from "./BrowserAutomationService.js";

export class StealthWindowManager {
  private mouseEventsIgnored = false;
  private currentMode: "overlay" | "automation" = "overlay";
  private titleRandomizationInterval?: ReturnType<typeof setInterval>;

  constructor(private processRandomizer: ProcessRandomizer) {}

  async createStealthWindow(
    isDev: boolean,
    preloadPath: string
  ): Promise<BrowserWindow> {
    const window = new BrowserWindow({
      width: 800,
      height: 600,
      transparent: true,
      frame: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      webPreferences: {
        preload: preloadPath,
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    if (isDev) {
      window.loadURL("http://localhost:5123");
      window.webContents.openDevTools({ mode: "detach" });
    } else {
      window.loadFile(path.join(app.getAppPath(), "dist-react/index.html"));
    }

    // Set up the toggle hotkey
    this.setupDefaultHotkeys(window);

    console.log("Window created and should be visible at center of screen");

    return window;
  }

  applyStealthMeasures(window: any): void {
    console.log("Applying stealth measures...");
    window.setOpacity(0.3);
    window.setSkipTaskbar(true);
    if (process.platform === "darwin") {
      // @ts-ignore
      window.setHiddenInMissionControl(true);
    }
    window.setContentProtection(true);
    console.log("Stealth measures applied");
  }

  removeStealthMeasures(window: any): void {
    console.log("Removing stealth measures...");
    window.setOpacity(0.95);
    window.setSkipTaskbar(false);
    if (process.platform === "darwin") {
      // @ts-ignore
      window.setHiddenInMissionControl(false);
    }
    window.setContentProtection(false);
    console.log("Stealth measures removed");
  }

  startTitleRandomization(window: any): void {
    const titles = [
      "System Configuration",
      "Audio Settings",
      "Network Monitor",
      "Performance Monitor",
      "System Information",
      "Device Manager",
      "Background Services",
      "System Updates",
      "Security Center",
      "Task Manager",
      "Resource Monitor",
      "System Properties",
      "Network Connections",
      "Audio Devices",
      "Display Settings",
      "Power Options",
      "System Tools",
      "Hardware Monitor",
    ];
    this.titleRandomizationInterval = setInterval(() => {
      try {
        if (!window.isDestroyed()) {
          const randomTitle = titles[Math.floor(Math.random() * titles.length)];
          window.setTitle(randomTitle);
        } else {
          this.stopTitleRandomization();
        }
      } catch (error) {
        console.warn("Could not update window title:", error);
        this.stopTitleRandomization();
      }
    }, 30000 + Math.random() * 30000); // 30-60 seconds
  }

  stopTitleRandomization(): void {
    if (this.titleRandomizationInterval) {
      clearInterval(this.titleRandomizationInterval);
      this.titleRandomizationInterval = undefined;
    }
  }

  async toggleVisibility(window: any): Promise<{ success: boolean }> {
    try {
      if (window.isVisible()) {
        window.hide();
        this.applyStealthMeasures(window);
      } else {
        this.removeStealthMeasures(window);
        window.showInactive();
      }
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  }

  async toggleClickThrough(window: any): Promise<{ success: boolean }> {
    try {
      this.mouseEventsIgnored = !this.mouseEventsIgnored;
      if (this.mouseEventsIgnored) {
        window.setIgnoreMouseEvents(true, { forward: true });
      } else {
        window.setIgnoreMouseEvents(false);
      }
      window.webContents.send("click-through-toggled", this.mouseEventsIgnored);
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  }

  async setMode(
    window: any,
    mode: "overlay" | "automation"
  ): Promise<{ success: boolean }> {
    try {
      this.currentMode = mode;
      const { width, height } = this.getWindowDimensions(mode);
      await this.animateResize(window, width, height);
      window.webContents.send("mode-changed", mode);
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  }

  updateGlobalShortcuts(
    keybinds: any,
    window: any,
    aiService: AIService,
    browserService: BrowserAutomationService
  ): void {
    globalShortcut.unregisterAll();
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    const moveIncrement = Math.floor(Math.min(width, height) * 0.05);
    this.registerMovementShortcuts(keybinds, window, moveIncrement);
    this.registerFunctionalityShortcuts(
      keybinds,
      window,
      aiService,
      browserService
    );
  }

  private registerMovementShortcuts(
    keybinds: any,
    window: any,
    increment: number
  ): void {
    const movements = {
      moveUp: () => this.moveWindow(window, 0, -increment),
      moveDown: () => this.moveWindow(window, 0, increment),
      moveLeft: () => this.moveWindow(window, -increment, 0),
      moveRight: () => this.moveWindow(window, increment, 0),
    };
    Object.entries(movements).forEach(([action, handler]) => {
      const keybind = keybinds[action];
      if (keybind) {
        try {
          globalShortcut.register(keybind, handler);
        } catch (error) {
          console.error(`Failed to register ${action}: ${error}`);
        }
      }
    });
  }

  private registerFunctionalityShortcuts(
    keybinds: any,
    window: any,
    aiService: AIService,
    browserService: BrowserAutomationService
  ): void {
    if (keybinds.toggleVisibility) {
      globalShortcut.register(keybinds.toggleVisibility, () => {
        this.toggleVisibility(window);
      });
    }
    if (keybinds.toggleClickThrough) {
      globalShortcut.register(keybinds.toggleClickThrough, () => {
        this.toggleClickThrough(window);
      });
    }
    if (keybinds.answerTrigger) {
      globalShortcut.register(keybinds.answerTrigger, () => {
        window.webContents.send("trigger-answer");
      });
    }
    if (keybinds.automationTrigger) {
      globalShortcut.register(keybinds.automationTrigger, () => {
        window.webContents.send("trigger-automation");
      });
    }
    if (keybinds.modeToggle) {
      globalShortcut.register(keybinds.modeToggle, () => {
        const newMode =
          this.currentMode === "overlay" ? "automation" : "overlay";
        this.setMode(window, newMode);
      });
    }
  }

  private moveWindow(window: any, deltaX: number, deltaY: number): void {
    if (!window.isVisible()) return;
    const [currentX, currentY] = window.getPosition();
    window.setPosition(currentX + deltaX, currentY + deltaY);
  }

  private centerWindow(window: any): void {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth } = primaryDisplay.workAreaSize;
    const [windowWidth] = window.getSize();
    const x = Math.floor((screenWidth - windowWidth) / 2);
    const y = 0;
    window.setPosition(x, y);
  }

  private getWindowDimensions(mode: "overlay" | "automation"): {
    width: number;
    height: number;
  } {
    if (mode === "overlay") {
      return { width: 800, height: 400 };
    } else {
      return { width: 1000, height: 600 };
    }
  }

  private async animateResize(
    window: any,
    targetWidth: number,
    targetHeight: number
  ): Promise<void> {
    return new Promise((resolve) => {
      const [startWidth, startHeight] = window.getSize();
      if (startWidth === targetWidth && startHeight === targetHeight) {
        resolve();
        return;
      }
      window.setResizable(true);
      const duration = 300;
      const frameRate = 60;
      const totalFrames = Math.floor(duration / (1000 / frameRate));
      let currentFrame = 0;
      const widthDiff = targetWidth - startWidth;
      const heightDiff = targetHeight - startHeight;
      const interval = setInterval(() => {
        currentFrame++;
        const progress = currentFrame / totalFrames;
        const easedProgress = 1 - Math.pow(1 - progress, 3);
        const currentWidth = Math.round(startWidth + widthDiff * easedProgress);
        const currentHeight = Math.round(
          startHeight + heightDiff * easedProgress
        );
        if (!window.isDestroyed()) {
          window.setSize(currentWidth, currentHeight);
          this.centerWindow(window);
        }
        if (currentFrame >= totalFrames) {
          clearInterval(interval);
          if (!window.isDestroyed()) {
            window.setSize(targetWidth, targetHeight);
            window.setResizable(false);
            this.centerWindow(window);
          }
          resolve();
        }
      }, 1000 / frameRate);
    });
  }

  private setupDefaultHotkeys(window: any): void {
    try {
      const toggleHandler = () => {
        if (window.isVisible()) {
          window.hide();
          this.applyStealthMeasures(window);
        } else {
          this.removeStealthMeasures(window);
          window.showInactive();
        }
      };
      globalShortcut.register("CommandOrControl+\\", toggleHandler);
    } catch (error) {
      console.error("Failed to register default hotkey:", error);
    }
  }
}

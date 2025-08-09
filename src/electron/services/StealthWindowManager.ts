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
  private contentProtectionEnabled = false;

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
      backgroundColor: "#00000000", // Fully transparent background
      hasShadow: false,
      webPreferences: {
        preload: preloadPath,
        contextIsolation: true,
        nodeIntegration: false,
        backgroundThrottling: false,
        // Enable media permissions for audio/video capture
        webSecurity: false, // Required for getDisplayMedia in some cases
        allowRunningInsecureContent: true,
        experimentalFeatures: true,
      },
    });

    if (isDev) {
      window.loadURL("http://localhost:5123");
      window.webContents.openDevTools({ mode: "detach" });
    } else {
      window.loadFile(path.join(app.getAppPath(), "dist-react/index.html"));
      // Enable content protection by default in production
      try {
        this.enableContentProtection(window);
        // Inform renderer so UI badge reflects the state immediately
        window.webContents.send("content-protection-toggled", true);
      } catch (e) {
        console.warn("Failed to enable content protection on startup:", e);
      }
    }

    // Set up the toggle hotkey
    this.setupDefaultHotkeys(window);

    // Ensure no title is ever set
    window.setTitle("");

    // Prevent title changes
    window.on("page-title-updated", (e: any) => {
      e.preventDefault();
    });

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
    // Content protection is controlled separately via toggleContentProtection()
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
    // Don't disable content protection when removing general stealth measures
    // It's controlled separately by toggleContentProtection
    console.log("Stealth measures removed");
  }

  /**
   * Enable content protection to prevent screenshots and video recording
   */
  enableContentProtection(window: any): void {
    try {
      window.setContentProtection(true);
      this.contentProtectionEnabled = true;
      console.log(
        "Content protection enabled - screenshots and video recording blocked"
      );

      // Additional stealth measures inspired by stealthFeatures.js
      if (process.platform === "win32") {
        try {
          window.setSkipTaskbar(true);
          console.log("Hidden from Windows taskbar for content protection");
        } catch (error) {
          console.warn(
            "Could not hide from taskbar:",
            (error as Error).message
          );
        }
      }

      if (process.platform === "darwin") {
        try {
          // @ts-ignore
          window.setHiddenInMissionControl(true);
          console.log(
            "Hidden from macOS Mission Control for content protection"
          );
        } catch (error) {
          console.warn(
            "Could not hide from Mission Control:",
            (error as Error).message
          );
        }
      }

      // Randomize window user agent for additional stealth
      try {
        const userAgents = [
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        ];
        const randomUA =
          userAgents[Math.floor(Math.random() * userAgents.length)];
        window.webContents.setUserAgent(randomUA);
        console.log("Set random user agent for stealth");
      } catch (error) {
        console.warn("Could not set user agent:", (error as Error).message);
      }
    } catch (error) {
      console.error("Failed to enable content protection:", error);
    }
  }

  /**
   * Disable content protection to allow screenshots and video recording
   */
  disableContentProtection(window: any): void {
    try {
      window.setContentProtection(false);
      this.contentProtectionEnabled = false;
      console.log(
        "Content protection disabled - screenshots and video recording allowed"
      );

      // Remove additional stealth measures
      if (process.platform === "win32") {
        try {
          window.setSkipTaskbar(false);
          console.log("Restored to Windows taskbar");
        } catch (error) {
          console.warn(
            "Could not restore to taskbar:",
            (error as Error).message
          );
        }
      }

      if (process.platform === "darwin") {
        try {
          // @ts-ignore
          window.setHiddenInMissionControl(false);
          console.log("Restored to macOS Mission Control");
        } catch (error) {
          console.warn(
            "Could not restore to Mission Control:",
            (error as Error).message
          );
        }
      }
    } catch (error) {
      console.error("Failed to disable content protection:", error);
    }
  }

  /**
   * Toggle content protection on/off
   */
  async toggleContentProtection(
    window: any
  ): Promise<{ success: boolean; enabled: boolean }> {
    try {
      if (this.contentProtectionEnabled) {
        this.disableContentProtection(window);
      } else {
        this.enableContentProtection(window);
      }

      // Notify the renderer process of the change
      window.webContents.send(
        "content-protection-toggled",
        this.contentProtectionEnabled
      );

      return { success: true, enabled: this.contentProtectionEnabled };
    } catch (error) {
      console.error("Failed to toggle content protection:", error);
      return { success: false, enabled: this.contentProtectionEnabled };
    }
  }

  /**
   * Get current content protection status
   */
  isContentProtectionEnabled(): boolean {
    return this.contentProtectionEnabled;
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
        // Only hide the window, don't apply stealth measures like content protection
      } else {
        window.showInactive();
        // Only show the window, don't modify stealth measures
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
          // Only hide the window, don't apply stealth measures like content protection
        } else {
          window.showInactive();
          // Only show the window, don't modify stealth measures
        }
      };
      globalShortcut.register("CommandOrControl+\\", toggleHandler);
    } catch (error) {
      console.error("Failed to register default hotkey:", error);
    }
  }
}

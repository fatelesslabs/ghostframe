const { BrowserWindow, globalShortcut, screen, app } = require("electron");
const path = require("path");

import { ProcessRandomizer } from "./ProcessRandomizer";
import { AIService } from "../ai/AIService";
import { BrowserAutomationService } from "../automation/BrowserAutomationService";

export class StealthWindowManager {
  private mouseEventsIgnored = false;
  private currentMode: "overlay" | "automation" = "overlay";
  private titleRandomizationInterval?: ReturnType<typeof setInterval>;

  constructor(private processRandomizer: ProcessRandomizer) {}

  async createStealthWindow(): Promise<any> {
    const window = new BrowserWindow({
      width: 600,
      height: 800,
      frame: true, // Show frame for maximum visibility
      transparent: false,
      alwaysOnTop: false, // Don't force always on top
      skipTaskbar: false,
      resizable: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, "../preload/preload.js"),
      },
      show: true, // Force show
      backgroundColor: "#1a1a1a", // Solid background
    });

    // Position in center of screen for maximum visibility
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } =
      primaryDisplay.workAreaSize;
    const x = Math.floor((screenWidth - 600) / 2);
    const y = Math.floor((screenHeight - 800) / 2);
    window.setPosition(x, y);

    // Load the renderer
    window.loadFile(path.join(__dirname, "../../renderer/index.html"));

    // Set clear window title
    window.setTitle("Ghostframe - AI Assistant");

    // Force the window to show and focus
    window.show();
    window.focus();

    // Set up the toggle hotkey
    this.setupDefaultHotkeys(window);

    console.log("Window created and should be visible at center of screen");

    return window;
  }

  applyStealthMeasures(window: any): void {
    console.log("Applying stealth measures...");

    // Make transparent and hide from taskbar for stealth mode
    window.setOpacity(0.3);
    window.setSkipTaskbar(true);

    // Platform-specific stealth
    if (process.platform === "darwin") {
      // Hide from Mission Control on macOS
      // @ts-ignore
      window.setHiddenInMissionControl(true);
    }

    // Enable content protection when in stealth mode
    window.setContentProtection(true);

    console.log("Stealth measures applied");
  }

  removeStealthMeasures(window: any): void {
    console.log("Removing stealth measures...");

    // Make fully visible and show in taskbar
    window.setOpacity(0.95);
    window.setSkipTaskbar(false);

    // Platform-specific visibility restoration
    if (process.platform === "darwin") {
      // @ts-ignore
      window.setHiddenInMissionControl(false);
    }

    // Disable content protection for normal mode
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

    // Change title every 30-60 seconds
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
        console.log("Hiding window and applying stealth");
        window.hide();
        this.applyStealthMeasures(window);
      } else {
        console.log("Showing window and removing stealth");
        this.removeStealthMeasures(window);
        window.showInactive();
      }

      return { success: true };
    } catch (error) {
      console.error("Error toggling visibility:", error);
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

      // Notify renderer about click-through state
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

      // Animate window resize
      await this.animateResize(window, width, height);

      // Notify renderer about mode change
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
    // Unregister all existing shortcuts
    globalShortcut.unregisterAll();

    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    const moveIncrement = Math.floor(Math.min(width, height) * 0.05);

    // Window movement shortcuts
    this.registerMovementShortcuts(keybinds, window, moveIncrement);

    // Functionality shortcuts
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
          console.log(`Registered ${action}: ${keybind}`);
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
    // Toggle visibility
    if (keybinds.toggleVisibility) {
      globalShortcut.register(keybinds.toggleVisibility, () => {
        this.toggleVisibility(window);
      });
    }

    // Toggle click-through
    if (keybinds.toggleClickThrough) {
      globalShortcut.register(keybinds.toggleClickThrough, () => {
        this.toggleClickThrough(window);
      });
    }

    // Answer/assist trigger
    if (keybinds.answerTrigger) {
      globalShortcut.register(keybinds.answerTrigger, () => {
        window.webContents.send("trigger-answer");
      });
    }

    // Automation trigger
    if (keybinds.automationTrigger) {
      globalShortcut.register(keybinds.automationTrigger, () => {
        window.webContents.send("trigger-automation");
      });
    }

    // Mode toggle
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
    const y = 0; // Keep at top of screen

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

      const duration = 300; // 300ms animation
      const frameRate = 60;
      const totalFrames = Math.floor(duration / (1000 / frameRate));
      let currentFrame = 0;

      const widthDiff = targetWidth - startWidth;
      const heightDiff = targetHeight - startHeight;

      const interval = setInterval(() => {
        currentFrame++;
        const progress = currentFrame / totalFrames;

        // Easing function (ease-out)
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
    const { globalShortcut } = require("electron");

    // Set up Ctrl+\ as the default toggle hotkey (exactly like Cheating Daddy)
    try {
      globalShortcut.register("CommandOrControl+\\", () => {
        console.log("Toggle hotkey pressed");
        if (window.isVisible()) {
          console.log("Hiding window");
          window.hide();
          // Apply stealth measures when hiding
          this.applyStealthMeasures(window);
        } else {
          console.log("Showing window");
          // Remove stealth measures when showing
          this.removeStealthMeasures(window);
          window.showInactive(); // Use showInactive like Cheating Daddy
        }
      });
      console.log("Default hotkey registered: Ctrl+\\");
    } catch (error) {
      console.error("Failed to register default hotkey:", error);
    }
  }
}

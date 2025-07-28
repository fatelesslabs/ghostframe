import { screen, desktopCapturer, nativeImage } from "electron";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export interface ScreenshotOptions {
  quality?: number; // 1-100 for JPEG
  format?: "jpeg" | "png";
  fullScreen?: boolean;
  displayId?: string;
  crop?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface ScreenshotResult {
  success: boolean;
  data?: string; // base64 encoded image
  metadata?: {
    width: number;
    height: number;
    format: string;
    timestamp: number;
    displayId?: string;
  };
  error?: string;
}

export class ScreenshotService {
  private periodicInterval: NodeJS.Timeout | null = null;
  private isPeriodicCapture = false;
  private lastScreenshot: string | null = null;
  private onScreenshotCallback: ((data: ScreenshotResult) => void) | null =
    null;

  async takeScreenshot(
    options: ScreenshotOptions = {}
  ): Promise<ScreenshotResult> {
    try {
      const defaultOptions: Required<ScreenshotOptions> = {
        quality: options.quality || 80,
        format: options.format || "jpeg",
        fullScreen: options.fullScreen !== false, // Default to true
        displayId: options.displayId || "primary",
        crop: options.crop || { x: 0, y: 0, width: 0, height: 0 },
      };

      // Get available displays
      const displays = screen.getAllDisplays();
      const targetDisplay =
        defaultOptions.displayId === "primary"
          ? screen.getPrimaryDisplay()
          : displays.find(
              (d) => d.id.toString() === defaultOptions.displayId
            ) || screen.getPrimaryDisplay();

      // Capture screen using desktopCapturer
      const sources = await desktopCapturer.getSources({
        types: ["screen"],
        thumbnailSize: {
          width: targetDisplay.bounds.width * targetDisplay.scaleFactor,
          height: targetDisplay.bounds.height * targetDisplay.scaleFactor,
        },
      });

      const screenSource =
        sources.find(
          (source) => source.display_id === targetDisplay.id.toString()
        ) || sources[0];

      if (!screenSource) {
        return { success: false, error: "No screen source found" };
      }

      let image = screenSource.thumbnail;

      // Apply cropping if specified
      if (defaultOptions.crop.width > 0 && defaultOptions.crop.height > 0) {
        const cropRect = {
          x: Math.max(0, defaultOptions.crop.x),
          y: Math.max(0, defaultOptions.crop.y),
          width: Math.min(
            image.getSize().width - defaultOptions.crop.x,
            defaultOptions.crop.width
          ),
          height: Math.min(
            image.getSize().height - defaultOptions.crop.y,
            defaultOptions.crop.height
          ),
        };

        image = image.crop(cropRect);
      }

      // Convert to desired format
      let imageData: string;
      if (defaultOptions.format === "jpeg") {
        imageData = image.toJPEG(defaultOptions.quality).toString("base64");
      } else {
        imageData = image.toPNG().toString("base64");
      }

      // Cache the screenshot
      this.lastScreenshot = imageData;

      const result: ScreenshotResult = {
        success: true,
        data: imageData,
        metadata: {
          width: image.getSize().width,
          height: image.getSize().height,
          format: defaultOptions.format,
          timestamp: Date.now(),
          displayId: targetDisplay.id.toString(),
        },
      };

      // Call callback if set
      if (this.onScreenshotCallback) {
        this.onScreenshotCallback(result);
      }

      return result;
    } catch (error) {
      const errorResult: ScreenshotResult = {
        success: false,
        error: (error as Error).message,
      };

      if (this.onScreenshotCallback) {
        this.onScreenshotCallback(errorResult);
      }

      return errorResult;
    }
  }

  async startPeriodicCapture(
    intervalSeconds: number,
    options: ScreenshotOptions = {}
  ): Promise<{ success: boolean; error?: string }> {
    if (this.isPeriodicCapture) {
      return { success: false, error: "Periodic capture already active" };
    }

    try {
      const intervalMs = Math.max(1000, intervalSeconds * 1000); // Minimum 1 second

      this.periodicInterval = setInterval(async () => {
        await this.takeScreenshot(options);
      }, intervalMs);

      this.isPeriodicCapture = true;
      console.log(
        `Started periodic screenshot capture every ${intervalSeconds} seconds`
      );

      // Take initial screenshot
      await this.takeScreenshot(options);

      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async stopPeriodicCapture(): Promise<{ success: boolean }> {
    if (this.periodicInterval) {
      clearInterval(this.periodicInterval);
      this.periodicInterval = null;
    }

    this.isPeriodicCapture = false;
    console.log("Stopped periodic screenshot capture");

    return { success: true };
  }

  setScreenshotCallback(callback: (data: ScreenshotResult) => void): void {
    this.onScreenshotCallback = callback;
  }

  getLastScreenshot(): string | null {
    return this.lastScreenshot;
  }

  async saveScreenshot(
    data: string,
    filename?: string
  ): Promise<{ success: boolean; path?: string; error?: string }> {
    try {
      const homeDir = os.homedir();
      const screenshotsDir = path.join(homeDir, "ghostframe-screenshots");

      // Create directory if it doesn't exist
      if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const fileName = filename || `screenshot-${timestamp}.jpg`;
      const filePath = path.join(screenshotsDir, fileName);

      // Convert base64 to buffer and save
      const buffer = Buffer.from(data, "base64");
      fs.writeFileSync(filePath, buffer);

      return { success: true, path: filePath };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async getDisplays(): Promise<
    Array<{ id: string; label: string; bounds: any; primary: boolean }>
  > {
    const displays = screen.getAllDisplays();
    const primaryDisplay = screen.getPrimaryDisplay();

    return displays.map((display) => ({
      id: display.id.toString(),
      label: display.label || `Display ${display.id}`,
      bounds: display.bounds,
      primary: display.id === primaryDisplay.id,
    }));
  }

  async captureWindow(windowTitle?: string): Promise<ScreenshotResult> {
    try {
      // Get window sources
      const sources = await desktopCapturer.getSources({
        types: ["window"],
        thumbnailSize: { width: 1920, height: 1080 },
      });

      let targetSource;
      if (windowTitle) {
        targetSource = sources.find((source) =>
          source.name.toLowerCase().includes(windowTitle.toLowerCase())
        );
      }

      if (!targetSource && sources.length > 0) {
        targetSource = sources[0]; // Use first window if no specific title found
      }

      if (!targetSource) {
        return { success: false, error: "No window found" };
      }

      const image = targetSource.thumbnail;
      const imageData = image.toJPEG(80).toString("base64");

      return {
        success: true,
        data: imageData,
        metadata: {
          width: image.getSize().width,
          height: image.getSize().height,
          format: "jpeg",
          timestamp: Date.now(),
        },
      };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  getStatus(): {
    isPeriodicCapture: boolean;
    hasLastScreenshot: boolean;
    displays: number;
  } {
    return {
      isPeriodicCapture: this.isPeriodicCapture,
      hasLastScreenshot: this.lastScreenshot !== null,
      displays: screen.getAllDisplays().length,
    };
  }

  async cleanup(): Promise<void> {
    await this.stopPeriodicCapture();
    this.lastScreenshot = null;
    this.onScreenshotCallback = null;
  }
}

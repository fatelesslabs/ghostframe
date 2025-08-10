import { ipcMain, BrowserWindow } from "electron";

export interface AppSettings {
  provider: "gemini" | "openai" | "claude";
  apiKey: string;
  customInstructions: string;
  profileType: "default" | "custom";
  profile?:
    | "interview"
    | "sales"
    | "meeting"
    | "presentation"
    | "negotiation"
    | "exam";
  googleSearchEnabled?: boolean;
}

export class SettingsService {
  constructor() {}

  initialize() {
    ipcMain.handle("settings:save", (_event, settings: AppSettings) => {
      this.saveSettings(settings);
    });

    ipcMain.handle("settings:get", () => {
      return this.getSettings();
    });
  }

  async getSettings(): Promise<AppSettings | null> {
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
      const settings = await windows[0].webContents.executeJavaScript(`
        (() => {
          try {
            const settings = localStorage.getItem('app-settings');
            return settings ? JSON.parse(settings) : null;
          } catch (e) {
            console.error('Error getting settings from localStorage:', e);
            return null;
          }
        })()
      `);
      return settings;
    }
    return null;
  }

  async saveSettings(settings: AppSettings) {
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
      await windows[0].webContents.executeJavaScript(`
        try {
          localStorage.setItem('app-settings', JSON.stringify(${JSON.stringify(
            settings
          )}));
        } catch (e) {
          console.error('Error saving settings to localStorage:', e);
        }
      `);
    }
  }
}

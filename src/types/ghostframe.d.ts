// Unified global type declaration for window.ghostframe
import type { AppSettings } from "../ui/SettingsView";

declare global {
  interface Window {
    ghostframe: {
      ai: {
        sendMessage: (
          message:
            | string
            | { message: string; apiKey?: string; customInstructions?: string }
        ) => Promise<{ success: boolean; response?: any }>;
        initialize?: (config: any) => Promise<any>;
        sendAudio?: (audioData: any) => Promise<any>;
        sendScreenshot?: (imageData: string) => Promise<any>;
        getStoredConfig?: () => Promise<any>;
      };
      capture: {
        startAudio: () => Promise<{ success: boolean }>;
        stopAudio: () => Promise<{ success: boolean }>;
        enableTranscription: (
          enabled: boolean
        ) => Promise<{ success: boolean }>;
        takeScreenshot?: () => Promise<{ success: boolean; data?: string }>;
      };
      window: {
        toggleVisibility: () => Promise<void>;
        toggleClickThrough: () => Promise<void>;
        toggleContentProtection: () => Promise<{ enabled: boolean }>;
        getContentProtectionStatus: () => Promise<{ enabled: boolean }>;
        move: (deltaX: number, deltaY: number) => Promise<void>;
        setPosition: (x: number, y: number) => Promise<void>;
        getPosition: () => Promise<[number, number]>;
        setMode?: (mode: string) => Promise<any>;
      };
      automation: {
        startSession: () => Promise<{ success: boolean }>;
        stopSession: () => Promise<{ success: boolean }>;
        executeAction: (action: {
          [key: string]: any;
          type: string;
        }) => Promise<{ success: boolean; result?: any }>;
      };
      settings?: {
        save: (settings: AppSettings) => Promise<{ success: boolean }>;
      };
      on: (channel: string, callback: (...args: any[]) => void) => void;
      off: (channel: string, callback: (...args: any[]) => void) => void;
      send?: (channel: string, ...args: any[]) => void;
    };
  }
}

export {};

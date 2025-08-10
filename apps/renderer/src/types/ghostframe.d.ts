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
        initialize?: (
          config: any & { verbosity?: "short" | "verbose" }
        ) => Promise<any>;
        sendAudio?: (audioData: any) => Promise<any>;
        sendScreenshot?: (imageData: string) => Promise<any>;
        getStoredConfig?: () => Promise<any>;
        setVerbosity?: (level: "short" | "verbose") => Promise<any>;
      };
      capture: {
        startAudio: () => Promise<{ success: boolean }>;
        stopAudio: () => Promise<{ success: boolean }>;
        enableTranscription: (
          enabled: boolean
        ) => Promise<{ success: boolean }>;
        getAudioDevices?: () => Promise<{
          success: boolean;
          devices?: string[];
        }>;
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
      clipboard?: {
        writeText: (text: string) => Promise<void>;
        readText: () => Promise<string>;
      };
      on: (
        channel: GhostframeChannel,
        callback: (...args: any[]) => void
      ) => void;
      off: (
        channel: GhostframeChannel,
        callback: (...args: any[]) => void
      ) => void;
      send?: (channel: string, ...args: any[]) => void;
    };
  }
}

// IPC channel enums for stronger typing
export type GhostframeChannel =
  | "ai-response"
  | "ai-status"
  | "click-through-toggled"
  | "content-protection-toggled"
  | "transcription-update"
  | "new-transcription-conversation"
  | "update-response"
  | "conversation-turn-saved"
  | "mode-changed"
  | "trigger-answer"
  | "trigger-automation"
  | "audio-data"
  | "screenshot-data"
  | "automation-progress"
  | "status-update"
  | "log-message";

export type AIStatus =
  | "initializing"
  | "connected"
  | "connecting"
  | "error"
  | "closed";

export interface AIResponseEvent {
  success?: boolean;
  text?: string;
  error?: string;
  provider?: string;
  serverContent?: { generationComplete?: boolean; turnComplete?: boolean };
}

export {};

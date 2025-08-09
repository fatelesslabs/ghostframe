import { useState, useEffect } from 'react';
import type { AppSettings } from '../SettingsView';

export const useSettings = () => {
  const [settings, setSettings] = useState<AppSettings>({
    provider: 'gemini',
    apiKey: '',
    customInstructions:
      "You are a helpful assistant. Analyze the screen and answer the user's question concisely.",
    profileType: 'default',
    profile: 'interview',
    googleSearchEnabled: true,
    windowOpacity: 85,
  });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const storedConfig = await window.ghostframe.ai.getStoredConfig?.();
        if (storedConfig && storedConfig.apiKey) {
          setSettings((prev) => ({
            ...prev,
            provider: storedConfig.provider || prev.provider,
            apiKey: storedConfig.apiKey || prev.apiKey,
          }));
        }
      } catch (error) {
        console.error('Failed to load stored settings:', error);
      }
    };

    loadSettings();
  }, []);

  return { settings, setSettings };
};

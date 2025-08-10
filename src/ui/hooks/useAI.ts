import { useState, useEffect, useRef } from "react";
import type { AppSettings } from "../SettingsView";

export const useAI = (settings: AppSettings) => {
  const [isAiReady, setIsAiReady] = useState(false);
  const [aiStatus, setAiStatus] = useState<
    "connected" | "connecting" | "disconnected" | "error"
  >("disconnected");
  const initializingRef = useRef<boolean>(false);

  useEffect(() => {
    const initializeAi = async () => {
      if (settings.apiKey && !initializingRef.current) {
        initializingRef.current = true;
        setAiStatus("connecting");
        try {
          console.log("Attempting to initialize AI...");
          const result = await window.ghostframe.ai.initialize?.({
            provider: settings.provider,
            apiKey: settings.apiKey,
            customPrompt: settings.customInstructions,
            profile: settings.profile,
            googleSearchEnabled: settings.googleSearchEnabled,
            verbosity: (settings as any).verbosity || "short",
          });
          console.log("AI initialization returned:", result);
          setIsAiReady(result?.success || false);
          setAiStatus(result?.success ? "connected" : "error");
          if (!result?.success) {
            console.error("AI initialization failed:", result?.error);
          }
        } catch (error) {
          console.error(
            "An unexpected error occurred during AI initialization:",
            error
          );
          setIsAiReady(false);
          setAiStatus("error");
        } finally {
          initializingRef.current = false;
        }
      }
    };

    initializeAi();
  }, [
    settings.apiKey,
    settings.provider,
    settings.customInstructions,
    settings.profile,
    settings.googleSearchEnabled,
  ]);

  return { isAiReady, aiStatus };
};

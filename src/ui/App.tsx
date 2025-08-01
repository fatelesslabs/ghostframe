import { useState, useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  Settings,
  Command,
  Eye,
  Bot,
  MessageSquare,
  Shield,
  GripHorizontal,
} from "lucide-react";
import { AutomationView } from "./AutomationView";
import { SettingsView } from "./SettingsView";
import type { AppSettings } from "./SettingsView";
import { AssistantView } from "./AssistantView";

const App = () => {
  const [mode, setMode] = useState<"assistant" | "automation" | "settings">(
    "assistant"
  );
  const [settings, setSettings] = useState<AppSettings>({
    provider: "gemini",
    apiKey: "",
    screenshotInterval: 5000,
    customInstructions:
      "You are a helpful assistant. Analyze the screen and answer the user's question concisely.",
    profileType: "default",
  });
  const [isRecording, setIsRecording] = useState(false);
  const [isClickThrough, setIsClickThrough] = useState(false);
  const [isContentProtected, setIsContentProtected] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [isAiReady, setIsAiReady] = useState(false);
  const [timer, setTimer] = useState("00:00");
  const [transcription, setTranscription] = useState("");
  const intervalRef = useRef<number | null>(null);
  const initializingRef = useRef<boolean>(false);

  useEffect(() => {
    const loadSettings = async () => {
      // Settings are loaded differently - remove this for now since there's no get method
      // const storedSettings = await window.ghostframe.settings.get();
      // if (storedSettings) {
      //   setSettings(storedSettings);
      // }
    };

    loadSettings();
  }, []);

  useEffect(() => {
    const initializeAi = async () => {
      if (settings.apiKey && !initializingRef.current) {
        initializingRef.current = true;
        try {
          console.log("Attempting to initialize AI...");
          const result = await window.ghostframe.ai.initialize?.({
            provider: settings.provider,
            apiKey: settings.apiKey,
            customPrompt: settings.customInstructions,
          });
          console.log("AI initialization returned:", result);
          setIsAiReady(result?.success || false);
          if (!result?.success) {
            console.error("AI initialization failed:", result?.error);
          }
        } catch (error) {
          console.error(
            "An unexpected error occurred during AI initialization:",
            error
          );
          setIsAiReady(false);
        } finally {
          initializingRef.current = false;
        }
      }
    };

    initializeAi();
  }, [settings.apiKey, settings.provider, settings.customInstructions]);

  useEffect(() => {
    const handleClickThroughToggle = (_event: any, enabled: boolean) => {
      setIsClickThrough(enabled);
    };

    const handleContentProtectionToggle = (_event: any, enabled: boolean) => {
      setIsContentProtected(enabled);
    };

    const handleTranscriptionUpdate = (_event: any, text: string) => {
      setTranscription(text);
    };

    const loadContentProtectionStatus = async () => {
      try {
        const status =
          await window.ghostframe.window?.getContentProtectionStatus?.();
        if (status) {
          setIsContentProtected(status.enabled);
        }
      } catch (error) {
        console.error("Failed to load content protection status:", error);
      }
    };

    if (window.ghostframe?.on) {
      window.ghostframe.on("click-through-toggled", handleClickThroughToggle);
      window.ghostframe.on(
        "content-protection-toggled",
        handleContentProtectionToggle
      );
      window.ghostframe.on("transcription-update", handleTranscriptionUpdate);
    }

    loadContentProtectionStatus();

    return () => {
      if (window.ghostframe?.off) {
        window.ghostframe.off(
          "click-through-toggled",
          handleClickThroughToggle
        );
        window.ghostframe.off(
          "content-protection-toggled",
          handleContentProtectionToggle
        );
        window.ghostframe.off(
          "transcription-update",
          handleTranscriptionUpdate
        );
      }
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Keyboard controls for window movement
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case "ArrowUp":
            e.preventDefault();
            window.ghostframe.window?.move?.(0, -20);
            break;
          case "ArrowDown":
            e.preventDefault();
            window.ghostframe.window?.move?.(0, 20);
            break;
          case "ArrowLeft":
            e.preventDefault();
            window.ghostframe.window?.move?.(-20, 0);
            break;
          case "ArrowRight":
            e.preventDefault();
            window.ghostframe.window?.move?.(20, 0);
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const startTimer = () => {
    let seconds = 0;
    intervalRef.current = window.setInterval(() => {
      seconds++;
      const mins = Math.floor(seconds / 60)
        .toString()
        .padStart(2, "0");
      const secs = (seconds % 60).toString().padStart(2, "0");
      setTimer(`${mins}:${secs}`);
    }, 1000);
  };

  const stopTimer = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setTimer("00:00");
  };

  const handleRecordToggle = async () => {
    if (isRecording) {
      await window.ghostframe.capture?.stopAudio?.();
      await window.ghostframe.capture?.enableTranscription?.(false);
      stopTimer();
      setTranscription("");
    } else {
      await window.ghostframe.capture?.startAudio?.();
      await window.ghostframe.capture?.enableTranscription?.(true);
      startTimer();
    }
    setIsRecording(!isRecording);
  };

  const handleToggleContentProtection = async () => {
    try {
      const result =
        await window.ghostframe.window?.toggleContentProtection?.();
      if (result) {
        setIsContentProtected(result.enabled);
      }
    } catch (error) {
      console.error("Failed to toggle content protection:", error);
    }
  };

  return (
    <div
      className={`app-container bg-transparent text-white p-4 font-sans ${
        isClickThrough ? "pointer-events-none" : ""
      }`}
    >
      <div className="bg-black/85 backdrop-blur-xl rounded-2xl p-4 border border-white/10 shadow-2xl">
        {/* Top Row - Mode Selection and System Controls */}
        <div className="header-container">
          <div className="flex items-center justify-between mb-4">
            {/* Mode Selector - Primary Navigation */}
            <div className="mode-selector">
              <button
                onClick={() => {
                  setMode("assistant");
                  setShowInput(true);
                }}
                className={`mode-btn ${
                  mode === "assistant" ? "mode-active" : "mode-inactive"
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>Assistant</span>
              </button>
              <button
                onClick={() => setMode("automation")}
                className={`mode-btn ${
                  mode === "automation" ? "mode-active" : "mode-inactive"
                }`}
              >
                <Bot className="w-4 h-4" />
                <span>Automation</span>
              </button>
            </div>

            {/* System Controls with inline drag handle */}
            <div className="flex items-center space-x-2">
              {/* Inline drag handle */}
              <span
                className="drag-handle cursor-move"
                title="Drag to move window"
              >
                <GripHorizontal className="w-4 h-4 text-gray-400 hover:text-gray-300 transition-colors cursor-pointer" />
              </span>
              {isContentProtected && (
                <div className="status-badge status-protected">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Protected</span>
                </div>
              )}
              <button
                onClick={handleToggleContentProtection}
                className={`protection-toggle ${
                  isContentProtected
                    ? "protection-active"
                    : "protection-inactive"
                }`}
                title={
                  isContentProtected
                    ? "Disable content protection"
                    : "Enable content protection"
                }
              >
                {isContentProtected ? (
                  <Shield className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={() => setMode("settings")}
                className="settings-btn"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Mode-Specific Controls */}
          {mode === "assistant" && (
            <div className="assistant-controls">
              <div className="flex items-center justify-between">
                {/* Recording Section */}
                <div className="flex items-center space-x-4">
                  <button
                    onClick={handleRecordToggle}
                    className={`record-button ${
                      isRecording ? "record-active" : "record-inactive"
                    }`}
                  >
                    {isRecording ? (
                      <MicOff className="w-5 h-5" />
                    ) : (
                      <Mic className="w-5 h-5" />
                    )}
                  </button>
                  <div className="timer-display">{timer}</div>
                </div>

                {/* Live Transcription Display */}
                {isRecording && (
                  <div className="transcription-area">
                    <div className="text-xs text-blue-400 mb-1 flex items-center">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-2"></div>
                      Live Transcription
                    </div>
                    <div className="bg-black/30 px-3 py-2 rounded-lg border border-blue-400/30 min-h-[40px] max-h-[80px] overflow-y-auto">
                      {transcription ? (
                        <span className="text-sm text-white/80">
                          {transcription}
                        </span>
                      ) : (
                        <span className="text-xs text-white/40 italic">
                          Listening...
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <div className="text-xs text-white/40">
                    {isRecording && !transcription && (
                      <span>
                        🎤 Recording both internal and external audio...
                      </span>
                    )}
                  </div>
                </div>

                {/* Assistant Actions */}
                <div className="action-buttons">
                  <button
                    onClick={() =>
                      window.ghostframe.capture?.takeScreenshot?.()
                    }
                    className="action-btn"
                  >
                    <span>Screenshot</span>
                  </button>
                  <button
                    onClick={() => setShowInput(!showInput)}
                    className="action-btn action-primary"
                  >
                    <span>Ask</span>
                    <Command className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {mode === "automation" && (
            <div className="automation-controls">
              <div className="flex items-center justify-between">
                <div className="text-sm text-white/70">
                  🤖 Browser Automation Mode
                </div>
                <div className="action-buttons">
                  <button
                    onClick={() =>
                      window.ghostframe.automation?.startSession?.()
                    }
                    className="action-btn action-primary"
                  >
                    <span>Start Session</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Main Content Area */}
        <div className="content-area">
          {mode === "assistant" && showInput && (
            <AssistantView
              settings={settings}
              showInput={showInput}
              isAiReady={isAiReady}
            />
          )}
          {mode === "automation" && <AutomationView />}
          {mode === "settings" && (
            <SettingsView settings={settings} setSettings={setSettings} />
          )}
        </div>
      </div>
    </div>
  );
};

export default App;

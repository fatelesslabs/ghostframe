import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import {
  Mic,
  MicOff,
  Settings,
  Eye,
  Bot,
  MessageSquare,
  Shield,
  ChevronLeft,
  ChevronRight,
  User,
  Copy,
  Check,
} from "lucide-react";
import { AutomationView } from "./AutomationView";
import { SettingsView } from "./SettingsView";
import type { AppSettings } from "./SettingsView";
import { AssistantView } from "./AssistantView";
import { WebAudioCapture } from "./WebAudioCapture";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

interface Conversation {
  id: string;
  userMessage: string;
  aiResponse: string;
  timestamp: string;
}

const App = () => {
  const [mode, setMode] = useState<"assistant" | "automation" | "settings">(
    "assistant"
  );
  const [settings, setSettings] = useState<AppSettings>({
    provider: "gemini",
    apiKey: "",
    customInstructions:
      "You are a helpful assistant. Analyze the screen and answer the user's question concisely.",
    profileType: "default",
    profile: "interview",
    googleSearchEnabled: true,
    windowOpacity: 85,
  });
  const [isRecording, setIsRecording] = useState(false);
  const [isContentProtected, setIsContentProtected] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [isAiReady, setIsAiReady] = useState(false);
  const [aiStatus, setAiStatus] = useState<
    "connected" | "connecting" | "disconnected" | "error"
  >("disconnected");
  const [timer, setTimer] = useState("00:00");

  // Proper conversation history system like Cluely
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationIndex, setCurrentConversationIndex] = useState(-1);
  const [pendingUserMessage, setPendingUserMessage] = useState("");
  const [streamingResponse, setStreamingResponse] = useState("");
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  const intervalRef = useRef<number | null>(null);
  const initializingRef = useRef<boolean>(false);
  const webAudioCapture = useRef<WebAudioCapture | null>(null);
  const screenshotTickerRef = useRef<number | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Load stored AI configuration
        const storedConfig = await window.ghostframe.ai.getStoredConfig?.();
        if (storedConfig && storedConfig.apiKey) {
          setSettings((prev) => ({
            ...prev,
            provider: storedConfig.provider || prev.provider,
            apiKey: storedConfig.apiKey || prev.apiKey,
          }));
        }
      } catch (error) {
        console.error("Failed to load stored settings:", error);
      }
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
            profile: settings.profile,
            googleSearchEnabled: settings.googleSearchEnabled,
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
  }, [
    settings.apiKey,
    settings.provider,
    settings.customInstructions,
    settings.profile,
    settings.googleSearchEnabled,
  ]);

  useEffect(() => {
    const handleClickThroughToggle = (_event: any, enabled: boolean) => {
      // Click through functionality removed for simplicity
      console.log("Click through toggle:", enabled);
    };

    const handleContentProtectionToggle = (_event: any, enabled: boolean) => {
      setIsContentProtected(enabled);
    };

    const handleTranscriptionUpdate = (_event: any, _text: string) => {
      // Live transcription no longer used - replaced with textarea
    };

    const handleAiResponse = (_event: any, response: any) => {
      console.log("🤖 AI Response received in UI:", response);
      if (response.text) {
        console.log("📝 AI Text Response:", response.text);

        // If we have a pending user message, create a new conversation or update existing streaming response
        if (pendingUserMessage) {
          if (streamingResponse) {
            // Accumulate the response text instead of replacing it
            setStreamingResponse((prev) => prev + response.text);
          } else {
            // Start streaming response
            setStreamingResponse(response.text);
          }
        } else {
          // Update streaming response for existing conversation
          setStreamingResponse((prev) => prev + response.text);
        }

        // Auto-copy to clipboard for quick pasting
        navigator.clipboard.writeText(response.text).catch(() => {});
      }
      if (response.serverContent?.generationComplete) {
        console.log("✅ AI Response generation complete");

        // Finalize streaming response if we have one
        if (pendingUserMessage && streamingResponse) {
          const finalResponse = streamingResponse + (response.text || "");
          const newConversation: Conversation = {
            id: Date.now().toString(),
            userMessage: pendingUserMessage,
            aiResponse: finalResponse,
            timestamp: new Date().toISOString(),
          };

          setConversations((prev) => [...prev, newConversation]);
          setCurrentConversationIndex((prev) => prev + 1);
          setPendingUserMessage("");
          setStreamingResponse("");
        }
      }
    };

    const handleUpdateResponse = (_event: any, responseText: string) => {
      console.log("📝 Cumulative AI Response:", responseText);
      // Use the cumulative response directly instead of appending
      setStreamingResponse(responseText);
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
      window.ghostframe.on("ai-response", handleAiResponse);
      window.ghostframe.on("update-response", handleUpdateResponse);
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
        window.ghostframe.off("ai-response", handleAiResponse);
        window.ghostframe.off("update-response", handleUpdateResponse);
      }
      if (intervalRef.current) clearInterval(intervalRef.current);

      // Clean up WebAudioCapture on unmount
      if (webAudioCapture.current?.isActive()) {
        webAudioCapture.current.stopCapture();
      }
    };
  }, []);

  // Keyboard controls for window movement and conversation navigation
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
            // Navigate to previous conversation if available
            if (currentConversationIndex > 0) {
              setCurrentConversationIndex(currentConversationIndex - 1);
            } else {
              window.ghostframe.window?.move?.(-20, 0);
            }
            break;
          case "ArrowRight":
            e.preventDefault();
            // Navigate to next conversation if available
            if (currentConversationIndex < conversations.length - 1) {
              setCurrentConversationIndex(currentConversationIndex + 1);
            } else {
              window.ghostframe.window?.move?.(20, 0);
            }
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentConversationIndex, conversations.length]);

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
      // Stop recording
      try {
        // Stop web-based audio capture if active
        if (webAudioCapture.current?.isActive()) {
          await webAudioCapture.current.stopCapture();
        }

        // Stop main process audio capture (fallback)
        await window.ghostframe.capture?.stopAudio?.();
        await window.ghostframe.capture?.enableTranscription?.(false);

        stopTimer();
      } catch (error) {
        console.error("Error stopping audio capture:", error);
      }
    } else {
      // Start recording
      try {
        let audioStarted = false;

        // Try browser-based audio capture first (loopback audio for Windows)
        if (WebAudioCapture.isSupported()) {
          console.log("🎤 Attempting Windows loopback audio capture...");
          console.log("� Will request microphone access for system audio");

          if (!webAudioCapture.current) {
            webAudioCapture.current = new WebAudioCapture();
          }

          const result = await webAudioCapture.current.startCapture();
          if (result.success) {
            console.log("✅ Windows loopback audio capture started");
            audioStarted = true;
          } else {
            console.warn(
              "❌ Windows loopback audio capture failed:",
              result.error
            );
            // Show user-friendly error in UI
            alert(
              `Audio Capture Failed:\n\n${result.error}\n\nFalling back to text-only mode.`
            );
          }
        }

        // Fallback to main process audio capture if browser method failed
        if (!audioStarted) {
          console.log("🔄 Falling back to main process audio capture...");
          await window.ghostframe.capture?.startAudio?.();
        }

        await window.ghostframe.capture?.enableTranscription?.(true);
        startTimer();
      } catch (error) {
        console.error("Error starting audio capture:", error);
      }
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

  // Start/stop 1s screenshot loop while mic is recording
  useEffect(() => {
    const clearTicker = () => {
      if (screenshotTickerRef.current) {
        clearInterval(screenshotTickerRef.current);
        screenshotTickerRef.current = null;
      }
    };

    if (isRecording) {
      // begin 1-second screenshots for live context
      clearTicker();
      screenshotTickerRef.current = window.setInterval(() => {
        window.ghostframe.capture?.takeScreenshot?.();
      }, 1000);
    } else {
      clearTicker();
    }

    return clearTicker;
  }, [isRecording]);

  // Helper functions for conversation navigation
  const getCurrentConversation = () => {
    return conversations.length > 0 && currentConversationIndex >= 0
      ? conversations[currentConversationIndex]
      : null;
  };

  const getConversationCounter = () => {
    return conversations.length > 0
      ? `${currentConversationIndex + 1}/${conversations.length}`
      : "";
  };

  const navigateToPreviousConversation = () => {
    if (currentConversationIndex > 0) {
      setCurrentConversationIndex(currentConversationIndex - 1);
    }
  };

  const navigateToNextConversation = () => {
    if (currentConversationIndex < conversations.length - 1) {
      setCurrentConversationIndex(currentConversationIndex + 1);
    }
  };

  // Function to start a new conversation
  const startNewConversation = (userMessage: string) => {
    setPendingUserMessage(userMessage);
    setStreamingResponse("");
  };

  // Update AI status based on connection state
  useEffect(() => {
    if (isAiReady) {
      setAiStatus("connected");
    } else if (initializingRef.current) {
      setAiStatus("connecting");
    } else {
      setAiStatus("disconnected");
    }
  }, [isAiReady]);

  // Send message function

  // Copy function
  const handleCopyResponse = async (text: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (error) {
      console.error("Failed to copy text:", error);
    }
  };

  return (
    <TooltipProvider>
      <div
        className="app-container text-white font-sans p-6 h-screen overflow-hidden"
        style={{ opacity: (settings.windowOpacity || 85) / 100 }}
      >
        <div className="bg-black/85 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl transition-all duration-300 p-6 h-full overflow-hidden flex flex-col max-w-full">
          {/* Header with AI Status Badge */}
          <div className="header-container">
            <div className="flex items-center justify-between mb-6">
              {/* Mode Selector - Primary Navigation */}
              <Tabs
                value={mode}
                onValueChange={(value) => {
                  setMode(value as "assistant" | "automation" | "settings");
                  if (value === "assistant") setShowInput(true);
                }}
                className="mode-selector"
              >
                <TabsList className="bg-white/5">
                  <TabsTrigger
                    value="assistant"
                    className="data-[state=active]:bg-blue-500/30 data-[state=active]:text-blue-300"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Assistant
                  </TabsTrigger>
                  <TabsTrigger
                    value="automation"
                    className="data-[state=active]:bg-blue-500/30 data-[state=active]:text-blue-300"
                  >
                    <Bot className="w-4 h-4 mr-2" />
                    Automation
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* System Controls with AI Status and drag handle */}
              <div className="flex items-center space-x-2">
                {/* AI Status Badge */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant={
                        aiStatus === "connected" ? "default" : "secondary"
                      }
                      className={`flex items-center space-x-2 ${
                        aiStatus === "connected"
                          ? "bg-green-500/15 text-green-300 border-green-400/30 hover:bg-green-500/25"
                          : aiStatus === "connecting"
                          ? "bg-yellow-500/15 text-yellow-300 border-yellow-400/30 hover:bg-yellow-500/25"
                          : aiStatus === "error"
                          ? "bg-red-500/15 text-red-300 border-red-400/30 hover:bg-red-500/25"
                          : "bg-gray-500/15 text-gray-300 border-gray-400/30 hover:bg-gray-500/25"
                      }`}
                    >
                      <div
                        className={`w-2 h-2 rounded-full ${
                          aiStatus === "connected"
                            ? "bg-green-400"
                            : aiStatus === "connecting"
                            ? "bg-yellow-400 animate-pulse"
                            : aiStatus === "error"
                            ? "bg-red-400"
                            : "bg-gray-400"
                        }`}
                      />
                      <span>
                        {aiStatus === "connected"
                          ? "Connected"
                          : aiStatus === "connecting"
                          ? "Connecting"
                          : aiStatus === "error"
                          ? "Error"
                          : "Disconnected"}
                      </span>
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent
                    side="bottom"
                    className="bg-black/90 text-white border-white/20 px-3 py-2"
                    sideOffset={8}
                  >
                    <p>
                      AI Model:{" "}
                      {settings.provider.charAt(0).toUpperCase() +
                        settings.provider.slice(1)}
                    </p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={handleToggleContentProtection}
                      variant="ghost"
                      size="sm"
                      className={`protection-toggle ${
                        isContentProtected
                          ? "bg-red-500/20 border-red-400/50 text-red-300 hover:bg-red-500/30"
                          : "bg-white/5 border-white/20 text-white/60 hover:bg-white/10 hover:text-white/80"
                      }`}
                    >
                      {isContentProtected ? (
                        <Shield className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="bottom"
                    className="bg-black/90 text-white border-white/20"
                  >
                    <p>
                      {isContentProtected
                        ? "Disable content protection"
                        : "Enable content protection"}
                    </p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={() => setMode("settings")}
                      variant="ghost"
                      size="sm"
                      className={`settings-btn ${
                        mode === "settings"
                          ? "ring-2 ring-purple-400/50 shadow-lg shadow-purple-400/20"
                          : ""
                      }`}
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="bottom"
                    className="bg-black/90 text-white border-white/20"
                  >
                    <p>Settings (Ctrl+,)</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Mode-Specific Controls */}
            {mode === "assistant" && (
              <div className="assistant-controls">
                <div className="flex items-center justify-between">
                  {/* Recording Section */}
                  <div className="flex items-center space-x-4">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={handleRecordToggle}
                          variant={isRecording ? "destructive" : "default"}
                          size="lg"
                          className={`w-12 h-12 rounded-full ${
                            isRecording
                              ? "bg-red-500/20 border-red-400/50 text-red-300 hover:bg-red-500/30"
                              : "bg-blue-500/20 border-blue-400/50 text-blue-300 hover:bg-blue-500/30"
                          }`}
                        >
                          {isRecording ? (
                            <MicOff className="w-5 h-5" />
                          ) : (
                            <Mic className="w-5 h-5" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="bottom"
                        className="bg-black/90 text-white border-white/20"
                      >
                        <p>
                          {isRecording
                            ? "Stop recording (Space)"
                            : "Start recording (Space)"}
                        </p>
                      </TooltipContent>
                    </Tooltip>

                    <div className="flex items-center space-x-3 flex-1">
                      <div className="timer-display">{timer}</div>
                    </div>
                  </div>

                  {/* Conversation Navigation (like cheating-daddy but for full conversations) */}
                  {conversations.length > 0 && (
                    <div className="flex items-center space-x-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            onClick={navigateToPreviousConversation}
                            disabled={currentConversationIndex <= 0}
                            variant="ghost"
                            size="sm"
                            className="nav-button"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Previous conversation (Ctrl+←)</p>
                        </TooltipContent>
                      </Tooltip>

                      <span className="response-counter text-xs text-white/60">
                        {getConversationCounter()}
                      </span>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            onClick={navigateToNextConversation}
                            disabled={
                              currentConversationIndex >=
                              conversations.length - 1
                            }
                            variant="ghost"
                            size="sm"
                            className="nav-button"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Next conversation (Ctrl+→)</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  )}

                  {/* Assistant Actions */}
                  <div className="action-buttons">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={() => setShowInput(!showInput)}
                          variant="ghost"
                          size="sm"
                          className="bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/30 text-blue-300 font-medium px-4 py-2 transition-all duration-200"
                        >
                          <span>Ask</span>
                          <MessageSquare className="w-4 h-4 ml-2" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="bottom"
                        className="bg-black/90 text-white border-white/20 px-3 py-2"
                        sideOffset={8}
                      >
                        <p>Ask AI assistant (Ctrl+K)</p>
                      </TooltipContent>
                    </Tooltip>
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
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={() =>
                            window.ghostframe.automation?.startSession?.()
                          }
                          variant="default"
                          className="action-btn action-primary"
                        >
                          <span>Start Session</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Start automation session</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Main Content Area */}
          <div className="content-area flex-1 overflow-y-auto min-h-0 max-w-full">
            {mode === "assistant" && (
              <>
                {/* Current Conversation Display (like Cluely) */}
                {getCurrentConversation() ? (
                  <div className="space-y-4 mb-4">
                    {/* User Message */}
                    <div className="bg-blue-500/10 backdrop-blur-xl rounded-xl p-4 border border-blue-400/20">
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-blue-500/30 backdrop-blur-sm rounded-full flex items-center justify-center border border-blue-400/50 flex-shrink-0">
                          <User className="w-4 h-4 text-blue-300" />
                        </div>
                        <div className="flex-1">
                          <div className="text-xs text-blue-300 mb-1 font-medium">
                            You
                          </div>
                          <div className="text-white/90 leading-relaxed">
                            {getCurrentConversation()?.userMessage}
                          </div>
                          <div className="text-xs text-blue-300/60 mt-2">
                            {new Date(
                              getCurrentConversation()?.timestamp || ""
                            ).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* AI Response */}
                    <div className="bg-black/20 backdrop-blur-xl rounded-xl p-4 border border-white/10">
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-purple-500/30 backdrop-blur-sm rounded-full flex items-center justify-center border border-purple-400/50 flex-shrink-0">
                          <Bot className="w-4 h-4 text-purple-300" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-end mb-2">
                            <Badge
                              variant="secondary"
                              className="text-xs text-purple-300/60 px-2 py-1 bg-purple-500/10 rounded-full border border-purple-400/20"
                            >
                              {settings.provider.charAt(0).toUpperCase() +
                                settings.provider.slice(1)}
                            </Badge>
                          </div>
                          <div className="relative group">
                            <div className="min-h-[120px] max-h-[400px] overflow-y-auto prose prose-sm bg-transparent p-0 text-white/80 max-w-full overflow-x-hidden break-words">
                              <ReactMarkdown
                                components={{
                                  code: ({ children, className }) => {
                                    const isInline = !className;
                                    return isInline ? (
                                      <code className="bg-white/10 text-white/90 px-1.5 py-0.5 rounded text-xs font-mono">
                                        {children}
                                      </code>
                                    ) : (
                                      <pre className="bg-black/40 border border-white/10 rounded-lg p-3 overflow-x-auto text-xs">
                                        <code className="text-white/90 font-mono text-xs leading-relaxed">
                                          {children}
                                        </code>
                                      </pre>
                                    );
                                  },
                                }}
                              >
                                {getCurrentConversation()?.aiResponse || ""}
                              </ReactMarkdown>
                            </div>
                            <button
                              onClick={() =>
                                handleCopyResponse(
                                  getCurrentConversation()?.aiResponse || "",
                                  getCurrentConversation()?.id || ""
                                )
                              }
                              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1.5 bg-black/60 hover:bg-black/80 rounded border border-white/20 text-white/70 hover:text-white"
                            >
                              {copiedMessageId ===
                              getCurrentConversation()?.id ? (
                                <Check className="w-3 h-3" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* Streaming Response */}
                {streamingResponse && (
                  <div className="bg-purple-500/10 backdrop-blur-xl rounded-xl p-4 border border-purple-400/20 mb-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-purple-500/30 backdrop-blur-sm rounded-full flex items-center justify-center border border-purple-400/50 flex-shrink-0">
                        <Bot className="w-4 h-4 text-purple-300" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-end mb-2">
                          <div className="flex space-x-1">
                            <div className="w-1 h-1 bg-purple-400 rounded-full animate-bounce" />
                            <div
                              className="w-1 h-1 bg-purple-400 rounded-full animate-bounce"
                              style={{ animationDelay: "0.1s" }}
                            />
                            <div
                              className="w-1 h-1 bg-purple-400 rounded-full animate-bounce"
                              style={{ animationDelay: "0.2s" }}
                            />
                          </div>
                        </div>
                        <div className="min-h-[100px] max-h-[400px] overflow-y-auto prose prose-sm bg-transparent p-0 text-white/80 max-w-full overflow-x-hidden break-words">
                          {streamingResponse ? (
                            <ReactMarkdown
                              components={{
                                code: ({ children, className }) => {
                                  const isInline = !className;
                                  return isInline ? (
                                    <code className="bg-white/10 text-white/90 px-1.5 py-0.5 rounded text-xs font-mono">
                                      {children}
                                    </code>
                                  ) : (
                                    <pre className="bg-black/40 border border-white/10 rounded-lg p-3 overflow-x-auto text-xs">
                                      <code className="text-white/90 font-mono text-xs leading-relaxed">
                                        {children}
                                      </code>
                                    </pre>
                                  );
                                },
                              }}
                            >
                              {streamingResponse}
                            </ReactMarkdown>
                          ) : (
                            <p className="text-white/60">AI is thinking...</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Show skeleton while waiting for response */}
                {pendingUserMessage && !streamingResponse && (
                  <div className="bg-purple-500/10 backdrop-blur-xl rounded-xl p-4 border border-purple-400/20 mb-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-purple-500/30 backdrop-blur-sm rounded-full flex items-center justify-center border border-purple-400/50 flex-shrink-0">
                        <Bot className="w-4 h-4 text-purple-300" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-end mb-2">
                          <div className="flex space-x-1">
                            <div className="w-1 h-1 bg-purple-400 rounded-full animate-bounce" />
                            <div
                              className="w-1 h-1 bg-purple-400 rounded-full animate-bounce"
                              style={{ animationDelay: "0.1s" }}
                            />
                            <div
                              className="w-1 h-1 bg-purple-400 rounded-full animate-bounce"
                              style={{ animationDelay: "0.2s" }}
                            />
                          </div>
                        </div>
                        <Skeleton className="h-4 w-full bg-white/10" />
                        <Skeleton className="h-4 w-3/4 bg-white/10" />
                        <Skeleton className="h-4 w-1/2 bg-white/10" />
                      </div>
                    </div>
                  </div>
                )}

                {showInput && (
                  <AssistantView
                    settings={settings}
                    showInput={showInput}
                    isAiReady={isAiReady}
                    onStartConversation={startNewConversation}
                  />
                )}
              </>
            )}
            {mode === "automation" && <AutomationView />}
            {mode === "settings" && (
              <SettingsView settings={settings} setSettings={setSettings} />
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default App;

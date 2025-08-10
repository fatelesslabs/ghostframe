import { useState, useEffect } from "react";
import { Settings, Eye, Bot, MessageSquare, Shield } from "lucide-react";
import { AutomationView } from "./AutomationView";
import { SettingsView } from "./SettingsView";
import { AssistantView } from "./AssistantView";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
//
import { useSettings } from "./hooks/useSettings";
import { useAI } from "./hooks/useAI";
import { useConversations } from "./hooks/useConversations";
import { useAudio } from "./hooks/useAudio";
import { useWindowEvents } from "./hooks/useWindowEvents";
import { useScreenshots } from "./hooks/useScreenshots";

const App = () => {
  const [mode, setMode] = useState<"assistant" | "automation" | "settings">(
    "assistant"
  );
  const [showInput, setShowInput] = useState(false);
  const [conversationStarted, setConversationStarted] = useState(false);
  //

  const { settings, setSettings } = useSettings();
  const { isAiReady, aiStatus } = useAI(settings);
  const {
    conversations,
    copiedMessageId,
    startNewConversation,
    getCurrentConversation,
    getConversationCounter,
    navigateToPreviousConversation,
    navigateToNextConversation,
    handleCopyResponse,
    currentConversationIndex,
    setCurrentConversationIndex,
  } = useConversations();
  const { isRecording, timer, handleRecordToggle } = useAudio();
  const { isContentProtected, handleToggleContentProtection } = useWindowEvents(
    {
      currentConversationIndex,
      conversationsLength: conversations.length,
      navigateToPreviousConversation,
      navigateToNextConversation,
      setCurrentConversationIndex,
    }
  );
  useScreenshots(isRecording);

  useEffect(() => {
    if (conversationStarted) {
      setConversationStarted(false);
    }
  }, [conversationStarted]);

  useEffect(() => {
    let t: any;
    if (conversations.length > 0 && mode === "assistant") {
      t = setTimeout(() => setShowInput(true), 150);
    }
    return () => t && clearTimeout(t);
  }, [conversations.length, mode]);

  return (
    <TooltipProvider>
      <div
        className="app-container text-white font-sans p-6 h-screen overflow-hidden"
        style={{
          opacity: (settings.windowOpacity || 85) / 100,
          filter: settings.highContrast
            ? "contrast(1.25) saturate(1.1)"
            : undefined,
          fontSize: `${(settings.fontScale ?? 1.0) * 16}px`,
        }}
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
            {/* Mode-Specific Controls (assistant controls moved into AssistantView) */}
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
              <AssistantView
                settings={settings}
                showInput={showInput || conversations.length > 0}
                isAiReady={isAiReady}
                conversations={conversations}
                copiedMessageId={copiedMessageId}
                getCurrentConversation={getCurrentConversation}
                getConversationCounter={getConversationCounter}
                navigateToPreviousConversation={navigateToPreviousConversation}
                navigateToNextConversation={navigateToNextConversation}
                handleCopyResponse={handleCopyResponse}
                currentConversationIndex={currentConversationIndex}
                isRecording={isRecording}
                timer={timer}
                handleRecordToggle={handleRecordToggle}
                onToggleShowInput={() => setShowInput(!showInput)}
                onStartConversation={(userMessage, screenshotData) =>
                  startNewConversation(
                    userMessage,
                    () => setConversationStarted(true),
                    screenshotData ? { screenshotData } : undefined
                  )
                }
              />
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

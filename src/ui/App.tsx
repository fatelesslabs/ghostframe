import { useState } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
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
    setCurrentConversationIndex
  } = useConversations();
  const { isRecording, timer, handleRecordToggle } = useAudio();
  const { isContentProtected, handleToggleContentProtection } = useWindowEvents({
    currentConversationIndex,
    conversationsLength: conversations.length,
    navigateToPreviousConversation,
    navigateToNextConversation,
    setCurrentConversationIndex
  });
  useScreenshots(isRecording);

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
                {getCurrentConversation() && (
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
                            {getCurrentConversation()?.aiResponse ? (
                              <div className="min-h-[120px] max-h-[400px] overflow-y-auto prose prose-sm bg-transparent p-0 text-white/80 max-w-full overflow-x-hidden break-words">
                                <ReactMarkdown
                                  key={getCurrentConversation()?.id}
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
                            ) : (
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
                            )}
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
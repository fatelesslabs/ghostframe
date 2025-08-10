import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import {
  Send,
  Mic,
  MicOff,
  ChevronLeft,
  ChevronRight,
  Bot,
  User,
  Copy,
  Check,
} from "lucide-react";
import { MessageSquare } from "lucide-react";
import type { AppSettings } from "./SettingsView";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Conversation } from "./hooks/useConversations";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AssistantViewProps {
  settings: AppSettings;
  showInput: boolean;
  isAiReady: boolean;
  // Assistant data/state lifted from hooks in App
  conversations: Conversation[];
  copiedMessageId: string | null;
  getCurrentConversation: () => Conversation | null;
  getConversationCounter: () => string;
  navigateToPreviousConversation: () => void;
  navigateToNextConversation: () => void;
  handleCopyResponse: (text: string, messageId: string) => Promise<void>;
  currentConversationIndex: number;
  // audio controls
  isRecording: boolean;
  timer: string;
  handleRecordToggle: () => Promise<void> | void;
  // UI handlers
  onToggleShowInput?: () => void;
  onStartConversation?: (userMessage: string, screenshotData?: string) => void;
}

export const AssistantView: React.FC<AssistantViewProps> = ({
  settings,
  showInput,
  isAiReady,
  conversations,
  copiedMessageId,
  getCurrentConversation,
  getConversationCounter,
  navigateToPreviousConversation,
  navigateToNextConversation,
  handleCopyResponse,
  currentConversationIndex,
  isRecording,
  timer,
  handleRecordToggle,
  onToggleShowInput,
  onStartConversation = () => {},
}) => {
  const [inputValue, setInputValue] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [verbosity, setVerbosity] = useState<"short" | "verbose">("short"); // UI toggle only; enforced internally in AI

  const lastCaptureAtRef = useRef<number>(0);
  const captureInFlightRef = useRef<boolean>(false);
  const typingDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastScreenshotDataRef = useRef<string | null>(null);
  const CAPTURE_COOLDOWN_MS = 2000; // minimum gap between screenshots
  const TYPING_DEBOUNCE_MS = 400; // wait for brief pause in typing

  const triggerScreenshot = async (reason: string) => {
    try {
      const now = Date.now();
      if (captureInFlightRef.current) return; // avoid overlapping captures
      if (now - lastCaptureAtRef.current < CAPTURE_COOLDOWN_MS) return; // respect cooldown

      captureInFlightRef.current = true;
      console.log(`📸 Triggering screenshot due to: ${reason}`);
      const result = await window.ghostframe.capture?.takeScreenshot?.();
      if (result?.success && (result as any)?.data) {
        const fmt = (result as any)?.metadata?.format || "jpeg";
        const data = (result as any).data as string;
        const dataUrl = `data:image/${fmt};base64,${data}`;
        lastScreenshotDataRef.current = dataUrl;
      }
      lastCaptureAtRef.current = Date.now();
    } catch (err) {
      console.warn("Screenshot capture failed:", err);
    } finally {
      captureInFlightRef.current = false;
    }
  };

  const scheduleTypingScreenshot = () => {
    if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
    typingDebounceRef.current = setTimeout(() => {
      triggerScreenshot("typing");
    }, TYPING_DEBOUNCE_MS);
  };

  useEffect(() => {
    return () => {
      if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
    };
  }, []); // Subscribe to transcription and ai-response to show transient UI states

  useEffect(() => {
    const onNewTranscription = () => setIsListening(true);
    const onTranscriptionUpdate = () => setIsListening(true);
    const onAiResponse = (_e: any, payload: any) => {
      if (payload?.text) setIsThinking(true);
      if (payload?.serverContent?.generationComplete) {
        setIsListening(false);
        setIsThinking(false);
      }
    };
    window.ghostframe?.on?.(
      "new-transcription-conversation",
      onNewTranscription
    );
    window.ghostframe?.on?.("transcription-update", onTranscriptionUpdate);
    window.ghostframe?.on?.("ai-response", onAiResponse);
    return () => {
      window.ghostframe?.off?.(
        "new-transcription-conversation",
        onNewTranscription
      );
      window.ghostframe?.off?.("transcription-update", onTranscriptionUpdate);
      window.ghostframe?.off?.("ai-response", onAiResponse);
    };
  }, []);

  const handleSubmitQuery = async () => {
    if (inputValue.trim() && settings.apiKey) {
      // Ensure we take a fresh screenshot just before sending
      await triggerScreenshot("submit");

      const currentInput = inputValue;
      setInputValue(""); // Start new conversation

      onStartConversation(
        currentInput,
        lastScreenshotDataRef.current || undefined
      ); // Clear the last captured screenshot data after attaching it
      lastScreenshotDataRef.current = null;

      try {
        await window.ghostframe.ai?.sendMessage?.(currentInput);
      } catch (error) {
        console.error("Error sending message:", error);
      }
    }
  };

  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      await triggerScreenshot("enter");
      await handleSubmitQuery();
    }
  };

  const handleInputFocus = () => {
    triggerScreenshot("focus");
  };

  const handleInputClick = () => {
    triggerScreenshot("click");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    scheduleTypingScreenshot();
  };

  const handleSendClick = async () => {
    await triggerScreenshot("send-button");
    await handleSubmitQuery();
  };

  return (
    <TooltipProvider>
      <div className="space-y-4 animate-in fade-in duration-300">
        {/* Assistant Controls */}
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
                {/* Transient capture/ai state badges */}
                {isListening && (
                  <div className="text-xs px-2 py-1 rounded bg-blue-500/15 text-blue-300 border border-blue-400/20">
                    Listening…
                  </div>
                )}
                {isThinking && (
                  <div className="text-xs px-2 py-1 rounded bg-purple-500/15 text-purple-300 border border-purple-400/20">
                    Thinking…
                  </div>
                )}
              </div>
            </div>

            {/* Conversation Navigation */}
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
                        currentConversationIndex >= conversations.length - 1
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
                    onClick={onToggleShowInput}
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

        {/* Main assistant content */}
        <div>
          {conversations.length > 0 ? (
            getCurrentConversation() && (
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
                      {/* Screenshot preview disabled */}
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
                          {copiedMessageId === getCurrentConversation()?.id ? (
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
            )
          ) : (
            <div className="text-center text-white/50 py-8">
              <Bot className="w-12 h-12 mx-auto mb-4 text-white/30" />
              <p className="text-sm">No conversation yet. Ask me anything!</p>
              <p className="text-xs mt-2 text-white/40">
                I can analyze screenshots, answer questions, and help with
                coding.
              </p>
            </div>
          )}
        </div>

        {/* Input Area */}
        {showInput && (
          <div className="bg-black/20 backdrop-blur-xl rounded-xl p-4 border border-white/10">
            <div className="flex items-center space-x-3">
              <Input
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={handleInputFocus}
                onClick={handleInputClick}
                placeholder={
                  isAiReady ? "Ask a question..." : "Initializing AI..."
                }
                className="flex-1 bg-white/5 border-white/20 text-white placeholder:text-white/40"
                autoFocus
                disabled={!isAiReady}
              />
              <Button
                variant={verbosity === "short" ? "secondary" : "ghost"}
                size="sm"
                onClick={async () => {
                  const next = verbosity === "short" ? "verbose" : "short";
                  setVerbosity(next);
                  try {
                    await window.ghostframe.ai?.setVerbosity?.(next);
                  } catch {}
                  toast.message(
                    next === "short" ? "Short answers" : "Verbose answers"
                  );
                }}
                className="px-3"
                title="Toggle answer length"
              >
                {verbosity === "short" ? "Short" : "Verbose"}
              </Button>
              <Button
                onClick={handleSendClick}
                disabled={!inputValue.trim() || !isAiReady}
                size="sm"
                className="px-4"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <div className="mt-2 text-[10px] text-white/40">
              {verbosity === "short"
                ? "Answers will be concise."
                : "Answers will include more details."}
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};

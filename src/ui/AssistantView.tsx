import React, { useState, useEffect, useRef } from "react";
import { Bot, User, Send } from "lucide-react";
import { marked } from "marked";
import type { AppSettings } from "./SettingsView";

interface Message {
  role: "user" | "ai";
  content: string;
  timestamp: string;
  // Internal flag to indicate streaming placeholder
  streaming?: boolean;
}

interface AssistantViewProps {
  settings: AppSettings;
  showInput: boolean;
  isAiReady: boolean;
}

export const AssistantView: React.FC<AssistantViewProps> = ({
  settings,
  showInput,
  isAiReady,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  // const [isProcessing, setIsProcessing] = useState(false); // Commented out as unused
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Enhanced markdown rendering function inspired by cheating-daddy
  const renderMarkdown = (content: string): string => {
    try {
      // Configure marked for better security and formatting
      marked.setOptions({
        breaks: true,
        gfm: true,
      });

      const rendered = marked.parse(content) as string;
      // For now, don't wrap words to avoid layout issues
      // return wrapWordsInSpans(rendered);
      return rendered;
    } catch (error) {
      console.warn("Error parsing markdown:", error);
      return content; // Fallback to plain text
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    console.log("AssistantView useEffect running - setting up event listeners");
    const recentMessages = new Map<string, number>(); // text -> timestamp
    let messageSequence = 0; // Track message order

    const handleAiResponse = (_event: any, response: any) => {
      const currentSequence = ++messageSequence;
      console.log(
        `AssistantView received ai-response #${currentSequence}:`,
        response
      );

      // If this is a turnComplete/generationComplete, finalize placeholder and return
      if (
        response?.serverContent?.turnComplete ||
        response?.serverContent?.generationComplete
      ) {
        console.log("Finalizing streaming placeholder");
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last && last.role === "ai" && last.streaming) {
            updated[updated.length - 1] = { ...last, streaming: false };
          }
          return updated;
        });
        return;
      }

      // Support both normalized payloads ({ text }) and raw Gemini messages
      const normalizedText =
        typeof response?.text === "string"
          ? response.text
          : response?.serverContent?.modelTurn?.parts
              ?.map((p: any) => p?.text)
              ?.filter((t: string | undefined) => !!t && t.trim().length > 0)
              ?.join("") || "";

      const text = normalizedText.trim();
      console.log(`Extracted text #${currentSequence}:`, text);
      if (!text) return; // Ignore status-only or empty chunks

      // More aggressive deduplication - check if this exact text was processed in the last 50ms
      const now = Date.now();
      const lastSeen = recentMessages.get(text);
      if (lastSeen && now - lastSeen < 50) {
        console.log(
          `Duplicate text chunk #${currentSequence} detected within 50ms, skipping:`,
          text
        );
        return;
      }
      recentMessages.set(text, now);

      // Clean up old entries (older than 1 second)
      for (const [key, timestamp] of recentMessages.entries()) {
        if (now - timestamp > 1000) {
          recentMessages.delete(key);
        }
      }

      setMessages((prevMessages) => {
        const updated = [...prevMessages];
        const lastMessage = updated[updated.length - 1];

        if (lastMessage && lastMessage.role === "ai") {
          // Append to the last AI message (placeholder or existing)
          console.log("Appending to existing AI message");
          updated[updated.length - 1] = {
            ...lastMessage,
            content:
              (lastMessage.content || "") +
              (lastMessage.content ? " " : "") +
              text,
          };
          return updated;
        }

        // No AI message yet, create streaming placeholder with first chunk
        console.log("Creating new AI message");
        return [
          ...updated,
          {
            role: "ai",
            content: text,
            timestamp: new Date().toISOString(),
            streaming: true,
          },
        ];
      });
    };

    const handleAiStatus = (_event: any, status: any) => {
      console.log("AssistantView received ai-status:", status);
      const statusMessage: Message = {
        role: "ai",
        content: `**Status:** ${status.status}`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, statusMessage]);
    };

    if (window.ghostframe?.on) {
      console.log("Registering ai-response event listener");
      window.ghostframe.on("ai-response", handleAiResponse);
      console.log("Registering ai-status event listener");
      window.ghostframe.on("ai-status", handleAiStatus);
    }

    return () => {
      console.log("AssistantView cleanup - removing event listeners");
      if (window.ghostframe?.off) {
        console.log("Removing ai-response event listener");
        window.ghostframe.off("ai-response", handleAiResponse);
        console.log("Removing ai-status event listener");
        window.ghostframe.off("ai-status", handleAiStatus);
      }
    };
  }, []);

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmitQuery = async () => {
    if (inputValue.trim() && settings.apiKey) {
      const userMessage: Message = {
        role: "user",
        content: inputValue,
        timestamp: new Date().toISOString(),
      };

      // Add user message and a streaming placeholder immediately
      setMessages((prev) => [
        ...prev,
        userMessage,
        {
          role: "ai",
          content: "", // will stream in
          timestamp: new Date().toISOString(),
          streaming: true,
        },
      ]);

      const currentInput = inputValue;
      setInputValue("");

      try {
        await window.ghostframe.ai?.sendMessage?.(currentInput);
      } catch (error) {
        const errorMessage: Message = {
          role: "ai",
          content: `**Error:** ${(error as Error).message}`,
          timestamp: new Date().toISOString(),
          streaming: false,
        };
        setMessages((prev) => {
          const updated = [...prev];
          // Replace placeholder with error if present
          const last = updated[updated.length - 1];
          if (last && last.role === "ai" && last.streaming) {
            updated[updated.length - 1] = errorMessage;
            return updated;
          }
          return [...updated, errorMessage];
        });
      }
    } else if (!settings.apiKey) {
      const errorApiKey: Message = {
        role: "ai",
        content:
          "**Error:** API key is not set. Please configure it in Settings.",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorApiKey]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmitQuery();
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* AI Status Indicator */}
      <div className="bg-black/20 backdrop-blur-xl rounded-xl p-4 border border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div
              className={`w-3 h-3 rounded-full ${
                isAiReady ? "bg-green-400" : "bg-yellow-400"
              }`}
            ></div>
            <span className="text-sm text-white/80">
              {isAiReady
                ? `AI Assistant ready (${settings.provider})`
                : "Initializing AI assistant..."}
            </span>
          </div>
          {!isAiReady && (
            <div className="text-xs text-white/60">
              Check your API key in settings
            </div>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="bg-black/20 backdrop-blur-xl rounded-xl p-4 border border-white/10">
        <div className="flex flex-col h-[calc(100vh-20rem)]">
          <div className="flex-grow overflow-y-auto pr-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-white/50 py-8">
                <Bot className="w-12 h-12 mx-auto mb-4 text-white/30" />
                <p className="text-sm">No conversation yet. Ask me anything!</p>
                <p className="text-xs mt-2 text-white/40">
                  I can analyze screenshots, answer questions, and help with
                  coding.
                </p>
              </div>
            )}
            {messages.map((msg, index) => (
              <div
                key={`${msg.role}-${msg.timestamp}-${index}`}
                className={`flex items-start space-x-4 ${
                  msg.role === "user" ? "justify-end" : ""
                }`}
              >
                {msg.role === "ai" && (
                  <div className="w-8 h-8 bg-blue-500/30 backdrop-blur-sm rounded-full flex items-center justify-center border border-blue-400/50 flex-shrink-0">
                    <Bot className="w-5 h-5 text-white/90" />
                  </div>
                )}
                <div
                  className={`p-4 rounded-2xl max-w-2xl ${
                    msg.role === "user"
                      ? "bg-white/10 border border-white/20"
                      : "bg-black/20 border border-white/10"
                  }`}
                >
                  {msg.streaming && msg.role === "ai" && !msg.content ? (
                    // Simple shimmer placeholder
                    <div className="w-64 h-4 rounded bg-white/10 overflow-hidden relative">
                      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_1.2s_infinite]" />
                      <style>{`@keyframes shimmer { 100% { transform: translateX(100%); } }`}</style>
                    </div>
                  ) : (
                    <div
                      className="prose prose-invert prose-sm max-w-none text-white/80 leading-relaxed"
                      dangerouslySetInnerHTML={{
                        __html: renderMarkdown(msg.content || ""),
                      }}
                    />
                  )}
                  <div className="text-xs text-white/40 mt-2 text-right">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </div>
                </div>
                {msg.role === "user" && (
                  <div className="w-8 h-8 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/20 flex-shrink-0">
                    <User className="w-5 h-5 text-white/90" />
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          {showInput && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="flex items-center space-x-3">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={
                    isAiReady ? "Ask a question..." : "Initializing AI..."
                  }
                  className="input-field flex-1"
                  autoFocus
                  disabled={!isAiReady}
                />
                <button
                  onClick={handleSubmitQuery}
                  disabled={!inputValue.trim() || !isAiReady}
                  className="action-btn action-primary px-4"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

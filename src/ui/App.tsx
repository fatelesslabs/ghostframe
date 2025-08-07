import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  Settings,
  Command,
  Send,
  EyeOff,
  Bot,
  MessageSquare,
  User,
} from "lucide-react";
import { marked } from "marked";
import { AutomationView } from "./AutomationView";
import { SettingsView } from "./SettingsView";
import type { AppSettings } from "./SettingsView";

interface Message {
  role: "user" | "ai";
  content: string;
  timestamp: string;
}

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
  const [showInput, setShowInput] = useState(true);
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [timer, setTimer] = useState("00:00");
  const intervalRef = useRef<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const loadSettings = async () => {
    };
    loadSettings();

    const handleAiResponse = (_event: any, response: any) => {
      const aiMessage: Message = {
        role: "ai",
        content: response.success
          ? response.text
          : `**AI Error:** ${response.error}`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, aiMessage]);
    };

    const handleClickThroughToggle = (_event: any, enabled: boolean) => {
      setIsClickThrough(enabled);
    };

    if (window.ghostframe?.on) {
      window.ghostframe.on("ai-response", handleAiResponse);
      window.ghostframe.on("click-through-toggled", handleClickThroughToggle);
    }

    return () => {
      if (window.ghostframe?.off) {
        window.ghostframe.off("ai-response", handleAiResponse);
        window.ghostframe.off(
          "click-through-toggled",
          handleClickThroughToggle
        );
      }
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
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
      stopTimer();
    } else {
      await window.ghostframe.capture?.startAudio?.();
      startTimer();
    }
    setIsRecording(!isRecording);
  };

  const handleToggleVisibility = () => {
    window.ghostframe.window?.toggleVisibility?.();
  };

  const handleSubmitQuery = async () => {
    if (inputValue.trim() && settings.apiKey) {
      const userMessage: Message = {
        role: "user",
        content: inputValue,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setInputValue("");

      try {
        await window.ghostframe.ai?.sendMessage?.(inputValue);
      } catch (error) {
        const errorMessage: Message = {
          role: "ai",
          content: `**Error:** ${(error as Error).message}`,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMessage]);
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
    <div
      className={`min-h-screen bg-transparent text-white p-4 font-sans ${
        isClickThrough ? "pointer-events-none" : ""
      }`}
    >
      <div className="max-w-4xl mx-auto">
        <div className="bg-black/30 backdrop-blur-xl rounded-2xl p-4 mb-6 border border-white/20 shadow-2xl">
          <div className="flex items-center justify-between">
            <button
              onClick={handleRecordToggle}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg backdrop-blur-sm ${
                isRecording
                  ? "bg-red-500/80 hover:bg-red-600/90 shadow-red-500/25"
                  : "bg-blue-500/80 hover:bg-blue-600/90 shadow-blue-500/25"
              }`}
            >
              {isRecording ? (
                <MicOff className="w-6 h-6" />
              ) : (
                <Mic className="w-6 h-6" />
              )}
            </button>

            <div className="flex flex-col items-center">
              <div className="text-3xl font-light text-white/90 tracking-wider mb-2">
                {timer}
              </div>
              <div className="flex items-center justify-center space-x-2">
                <button
                  onClick={() => setMode("assistant")}
                  className={`btn-mode ${
                    mode === "assistant"
                      ? "btn-mode-active-blue"
                      : "btn-mode-inactive"
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Assistant</span>
                </button>
                <button
                  onClick={() => setMode("automation")}
                  className={`btn-mode ${
                    mode === "automation"
                      ? "btn-mode-active-purple"
                      : "btn-mode-inactive"
                  }`}
                >
                  <Bot className="w-4 h-4" />
                  <span>Automation</span>
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={() => window.ghostframe.capture?.takeScreenshot?.()}
                className="btn-secondary"
              >
                <span>Screenshot</span>
              </button>
              <button
                onClick={() => setShowInput(!showInput)}
                className="btn-secondary"
              >
                <span>Ask</span>
                <Command className="w-4 h-4" />
              </button>
              <button onClick={handleToggleVisibility} className="btn-icon">
                <EyeOff className="w-5 h-5" />
              </button>
              <button onClick={() => setMode("settings")} className="btn-icon">
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {mode === "assistant" && (
        <div className="flex flex-col h-[calc(100vh-12rem)]">
          <div className="flex-grow overflow-y-auto pr-4 space-y-4">
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
                  <div
                    className="prose prose-invert prose-sm max-w-none text-white/80 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: marked(msg.content) }}
                  />
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
          {showInput && (
            <div className="bg-black/30 backdrop-blur-xl rounded-2xl p-4 mt-4 border border-white/20 shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
              <div className="flex items-center space-x-3">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask a question..."
                  className="input-field flex-1"
                  autoFocus
                />
                <button
                  onClick={handleSubmitQuery}
                  disabled={!inputValue.trim()}
                  className="btn-primary"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {mode === "automation" && <AutomationView />}
      {mode === "settings" && (
        <SettingsView settings={settings} setSettings={setSettings} />
      )}
    </div>
  );
};

export default App;

import React, { useState, useEffect, useRef } from "react";
import { Send } from "lucide-react";
import type { AppSettings } from "./SettingsView";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface AssistantViewProps {
  settings: AppSettings;
  showInput: boolean;
  isAiReady: boolean;
  onStartConversation?: (userMessage: string) => void;
}

export const AssistantView: React.FC<AssistantViewProps> = ({
  settings,
  showInput,
  isAiReady,
  onStartConversation = () => {},
}) => {
  const [inputValue, setInputValue] = useState("");

  // Screenshot on input interactions (focus/typing/send)
  const lastCaptureAtRef = useRef<number>(0);
  const captureInFlightRef = useRef<boolean>(false);
  const typingDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const CAPTURE_COOLDOWN_MS = 2000; // minimum gap between screenshots
  const TYPING_DEBOUNCE_MS = 400; // wait for brief pause in typing

  const triggerScreenshot = async (reason: string) => {
    try {
      const now = Date.now();
      if (captureInFlightRef.current) return; // avoid overlapping captures
      if (now - lastCaptureAtRef.current < CAPTURE_COOLDOWN_MS) return; // respect cooldown

      captureInFlightRef.current = true;
      console.log(`📸 Triggering screenshot due to: ${reason}`);
      await window.ghostframe.capture?.takeScreenshot?.();
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
  }, []);

  const handleSubmitQuery = async () => {
    if (inputValue.trim() && settings.apiKey) {
      // Ensure we take a fresh screenshot just before sending
      await triggerScreenshot("submit");

      const currentInput = inputValue;
      setInputValue("");

      // Start new conversation
      onStartConversation(currentInput);

      try {
        await window.ghostframe.ai?.sendMessage?.(currentInput);
      } catch (error) {
        console.error("Error sending message:", error);
      }
    }
  };

  const handleKeyPress = async (e: React.KeyboardEvent) => {
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
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Input Area */}
      {showInput && (
        <div className="bg-black/20 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <div className="flex items-center space-x-3">
            <Input
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
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
              onClick={handleSendClick}
              disabled={!inputValue.trim() || !isAiReady}
              size="sm"
              className="px-4"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

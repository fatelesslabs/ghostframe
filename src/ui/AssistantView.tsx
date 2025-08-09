import React, { useState, useEffect, useRef } from "react";
import { Send } from "lucide-react";
import type { AppSettings } from "./SettingsView";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface AssistantViewProps {
  settings: AppSettings;
  showInput: boolean;
  isAiReady: boolean;
  onStartConversation?: (userMessage: string, screenshotData?: string) => void;
}

export const AssistantView: React.FC<AssistantViewProps> = ({
  settings,
  showInput,
  isAiReady,
  onStartConversation = () => {},
}) => {
  const [inputValue, setInputValue] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);

  // Screenshot on input interactions (focus/typing/send)
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
  }, []);

  // Subscribe to transcription and ai-response to show transient UI states
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
      setInputValue("");

      // Start new conversation
      onStartConversation(
        currentInput,
        lastScreenshotDataRef.current || undefined
      );
      // Clear the last captured screenshot data after attaching it
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
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Transient capture/ai state badges */}
      <div className="flex items-center space-x-2">
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

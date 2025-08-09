import { useState, useEffect, useCallback, useRef } from "react";

export interface Conversation {
  id: string;
  userMessage: string;
  aiResponse: string;
  timestamp: string;
  screenshotData?: string;
}

export const useConversations = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationIndex, setCurrentConversationIndex] = useState(-1);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  // Track whether a transcription-driven conversation is in progress to avoid duplicates
  const transcriptionActiveRef = useRef<boolean>(false);
  const lastTranscriptionAtRef = useRef<number>(0);
  // Track which conversation is currently receiving streaming updates
  const activeConversationIdRef = useRef<string | null>(null);

  // Normalize transcription to ASCII/English-friendly text
  const normalizeToEnglish = (text: string): string => {
    if (!text) return text;
    const noDiacritics = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return noDiacritics
      .replace(/[^\x20-\x7E]+/g, " ") // remove non-ASCII printable
      .replace(/\s{2,}/g, " ")
      .trim();
  };

  const handleAiResponse = useCallback((response: any) => {
    // Streamed text parts
    if (response.text) {
      setConversations((prev) => {
        const targetId = activeConversationIdRef.current;
        if (!targetId) return prev;
        return prev.map((c) =>
          c.id === targetId
            ? { ...c, aiResponse: (c.aiResponse || "") + response.text }
            : c
        );
      });
    }

    // Turn-complete signal from AIService (end of this question/answer)
    if (response?.serverContent?.generationComplete) {
      transcriptionActiveRef.current = false;
      lastTranscriptionAtRef.current = Date.now();
      // Keep activeConversationId to allow subsequent outputs (e.g., screenshot + text) to continue updating the same conversation
    }
  }, []);

  useEffect(() => {
    const handleUpdate = (_event: any, responseText: string) => {
      setConversations((prev) => {
        let targetId = activeConversationIdRef.current;
        if (!targetId && prev.length > 0) {
          targetId = prev[prev.length - 1].id;
          activeConversationIdRef.current = targetId;
        }
        if (!targetId) return prev;
        const trimmed = (responseText || "").trim();
        if (!trimmed || trimmed === "[ping]") return prev; // ignore empty/heartbeat
        return prev.map((c) => {
          if (c.id !== targetId) return c;
          if (!c.aiResponse || trimmed.length >= c.aiResponse.length) {
            return { ...c, aiResponse: trimmed };
          }
          return c;
        });
      });
    };

    const handleNewTranscription = (_event: any, transcription: string) => {
      const now = Date.now();
      const IDLE_MS_TO_START_NEW = 2000; // start a new convo only if idle for a bit
      const normalized = normalizeToEnglish(transcription);

      if (
        !transcriptionActiveRef.current ||
        now - lastTranscriptionAtRef.current > IDLE_MS_TO_START_NEW
      ) {
        // Start a new conversation for a fresh transcription turn
        startNewConversation(normalized, () => {});
        transcriptionActiveRef.current = true;
      } else {
        // A transcription is already active — update the current conversation's user message
        setConversations((prev) => {
          const targetId = activeConversationIdRef.current;
          if (!targetId) return prev;
          return prev.map((c) =>
            c.id === targetId ? { ...c, userMessage: normalized } : c
          );
        });
      }
      lastTranscriptionAtRef.current = now;
    };

    const handleTranscriptionUpdate = (_event: any, transcription: string) => {
      lastTranscriptionAtRef.current = Date.now();
      const normalized = normalizeToEnglish(transcription);
      setConversations((prev) => {
        const targetId = activeConversationIdRef.current;
        if (!targetId) return prev;
        return prev.map((c) =>
          c.id === targetId ? { ...c, userMessage: normalized } : c
        );
      });
    };

    const aiResponseHandler = (_event: any, response: any) =>
      handleAiResponse(response);

    if (window.ghostframe?.on) {
      window.ghostframe.on("ai-response", aiResponseHandler);
      window.ghostframe.on("update-response", handleUpdate);
      window.ghostframe.on(
        "new-transcription-conversation",
        handleNewTranscription
      );
      window.ghostframe.on("transcription-update", handleTranscriptionUpdate);
    }

    return () => {
      if (window.ghostframe?.off) {
        window.ghostframe.off("ai-response", aiResponseHandler);
        window.ghostframe.off("update-response", handleUpdate);
        window.ghostframe.off(
          "new-transcription-conversation",
          handleNewTranscription
        );
        window.ghostframe.off(
          "transcription-update",
          handleTranscriptionUpdate
        );
      }
    };
  }, [handleAiResponse]);

  const startNewConversation = (
    userMessage: string,
    callback: () => void,
    opts?: { screenshotData?: string }
  ) => {
    const id = Date.now().toString();
    const newConversation: Conversation = {
      id,
      userMessage,
      aiResponse: "",
      timestamp: new Date().toISOString(),
      screenshotData: opts?.screenshotData,
    };
    setConversations((prev) => {
      const updated = [...prev, newConversation];
      // Ensure index matches the newly appended item
      setCurrentConversationIndex(updated.length - 1);
      return updated;
    });
    activeConversationIdRef.current = id;
    callback();
  };

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

  const handleCopyResponse = async (text: string, messageId: string) => {
    try {
      // Extract fenced code blocks if present; otherwise copy the whole text
      const codeBlockRegex = /```[\s\S]*?```/g;
      const codeBlocks = text.match(codeBlockRegex);
      const toCopy = codeBlocks
        ? codeBlocks
            .map((block) =>
              block.replace(/^```[a-zA-Z0-9]*\n?|```$/g, "").trim()
            )
            .join("\n\n")
        : text;
      if (window.ghostframe?.clipboard?.writeText) {
        await window.ghostframe.clipboard.writeText(toCopy);
      } else {
        await navigator.clipboard.writeText(toCopy);
      }
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (error) {
      console.error("Failed to copy text:", error);
    }
  };

  return {
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
  };
};

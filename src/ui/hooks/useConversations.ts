import { useState, useEffect, useCallback, useRef } from "react";

export interface Conversation {
  id: string;
  userMessage: string;
  aiResponse: string;
  timestamp: string;
}

export const useConversations = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationIndex, setCurrentConversationIndex] = useState(-1);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  // Track whether a transcription-driven conversation is in progress to avoid duplicates
  const transcriptionActiveRef = useRef<boolean>(false);
  const lastTranscriptionAtRef = useRef<number>(0);

  const handleAiResponse = useCallback(
    (response: any) => {
      // Streamed text parts
      if (response.text) {
        setConversations((prev) => {
          const newConversations = [...prev];
          if (newConversations[currentConversationIndex]) {
            newConversations[currentConversationIndex].aiResponse +=
              response.text;
          }
          return newConversations;
        });
      }

      // Turn-complete signal from AIService (end of this question/answer)
      if (response?.serverContent?.generationComplete) {
        transcriptionActiveRef.current = false;
        lastTranscriptionAtRef.current = Date.now();
      }
    },
    [currentConversationIndex]
  );

  useEffect(() => {
    const handleUpdate = (_event: any, responseText: string) => {
      setConversations((prev) => {
        const newConversations = [...prev];
        if (newConversations[currentConversationIndex]) {
          newConversations[currentConversationIndex].aiResponse = responseText;
        }
        return newConversations;
      });
    };

    const handleNewTranscription = (_event: any, transcription: string) => {
      const now = Date.now();
      const IDLE_MS_TO_START_NEW = 2000; // start a new convo only if idle for a bit

      if (
        !transcriptionActiveRef.current ||
        now - lastTranscriptionAtRef.current > IDLE_MS_TO_START_NEW
      ) {
        // Start a new conversation for a fresh transcription turn
        startNewConversation(transcription, () => {});
        transcriptionActiveRef.current = true;
      } else {
        // A transcription is already active — update the current conversation's user message
        setConversations((prev) => {
          const newConversations = [...prev];
          if (newConversations[currentConversationIndex]) {
            newConversations[currentConversationIndex].userMessage =
              transcription;
          }
          return newConversations;
        });
      }
      lastTranscriptionAtRef.current = now;
    };

    const handleTranscriptionUpdate = (_event: any, transcription: string) => {
      lastTranscriptionAtRef.current = Date.now();
      setConversations((prev) => {
        const newConversations = [...prev];
        if (newConversations[currentConversationIndex]) {
          newConversations[currentConversationIndex].userMessage =
            transcription;
        }
        return newConversations;
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
  }, [handleAiResponse, currentConversationIndex]);

  const startNewConversation = (userMessage: string, callback: () => void) => {
    const newConversation: Conversation = {
      id: Date.now().toString(),
      userMessage,
      aiResponse: "",
      timestamp: new Date().toISOString(),
    };
    setConversations((prev) => {
      const updated = [...prev, newConversation];
      // Ensure index matches the newly appended item
      setCurrentConversationIndex(updated.length - 1);
      return updated;
    });
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
      await navigator.clipboard.writeText(text);
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

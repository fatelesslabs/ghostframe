import { useState, useEffect, useCallback } from "react";

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

  const handleAiResponse = useCallback(
    (response: any) => {
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
    },
    [currentConversationIndex]
  );

  useEffect(() => {
    const handleUpdate = (_event: any, responseText: string) => {
      console.log("📨 Received update-response event:", responseText);
      setConversations((prev) => {
        const newConversations = [...prev];
        if (newConversations[currentConversationIndex]) {
          newConversations[currentConversationIndex].aiResponse = responseText;
        }
        return newConversations;
      });
    };

    const handleNewTranscription = (_event: any, transcription: string) => {
      console.log(
        "🎤 Received new-transcription-conversation event:",
        transcription
      );
      startNewConversation(transcription, () => {});
    };

    const aiResponseHandler = (_event: any, response: any) => {
      console.log("🤖 Received ai-response event:", response);
      handleAiResponse(response);
    };

    if (window.ghostframe?.on) {
      console.log("🔗 Registering conversation event listeners...");
      window.ghostframe.on("ai-response", aiResponseHandler);
      window.ghostframe.on("update-response", handleUpdate);
      window.ghostframe.on(
        "new-transcription-conversation",
        handleNewTranscription
      );
      console.log("✅ Conversation event listeners registered");
    } else {
      console.error("❌ window.ghostframe.on is not available");
    }

    return () => {
      if (window.ghostframe?.off) {
        console.log("🔗 Unregistering conversation event listeners...");
        window.ghostframe.off("ai-response", aiResponseHandler);
        window.ghostframe.off("update-response", handleUpdate);
        window.ghostframe.off(
          "new-transcription-conversation",
          handleNewTranscription
        );
        console.log("✅ Conversation event listeners unregistered");
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
      const newConversations = [...prev, newConversation];
      setCurrentConversationIndex(newConversations.length - 1);
      return newConversations;
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

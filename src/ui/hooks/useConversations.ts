import { useState, useEffect, useCallback } from 'react';

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

  const handleAiResponse = useCallback((response: any) => {
    if (response.text) {
      setConversations(prev => {
        const newConversations = [...prev];
        if (newConversations[currentConversationIndex]) {
          newConversations[currentConversationIndex].aiResponse += response.text;
        }
        return newConversations;
      });
    }
  }, [currentConversationIndex]);

  useEffect(() => {
    const handleUpdate = (_event: any, responseText: string) => {
        setConversations(prev => {
            const newConversations = [...prev];
            if (newConversations[currentConversationIndex]) {
              newConversations[currentConversationIndex].aiResponse = responseText;
            }
            return newConversations;
        });
    };

    const aiResponseHandler = (_event: any, response: any) => handleAiResponse(response);

    if (window.ghostframe?.on) {
      window.ghostframe.on('ai-response', aiResponseHandler);
      window.ghostframe.on('update-response', handleUpdate);
    }

    return () => {
      if (window.ghostframe?.off) {
        window.ghostframe.off('ai-response', aiResponseHandler);
        window.ghostframe.off('update-response', handleUpdate);
      }
    };
  }, [handleAiResponse, currentConversationIndex]);

  const startNewConversation = (userMessage: string) => {
    const newConversation: Conversation = {
      id: Date.now().toString(),
      userMessage,
      aiResponse: '',
      timestamp: new Date().toISOString(),
    };
    setConversations(prev => [...prev, newConversation]);
    setCurrentConversationIndex(conversations.length);
  };

  const getCurrentConversation = () => {
    return conversations.length > 0 && currentConversationIndex >= 0
      ? conversations[currentConversationIndex]
      : null;
  };

  const getConversationCounter = () => {
    return conversations.length > 0
      ? `${currentConversationIndex + 1}/${conversations.length}`
      : '';
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
      console.error('Failed to copy text:', error);
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
    setCurrentConversationIndex
  };
};
import { useState, useEffect } from 'react';

interface UseWindowEventsProps {
    currentConversationIndex: number;
    conversationsLength: number;
    navigateToPreviousConversation: () => void;
    navigateToNextConversation: () => void;
    setCurrentConversationIndex: (index: number) => void;
}

export const useWindowEvents = ({
    currentConversationIndex,
    conversationsLength,
    navigateToPreviousConversation,
    navigateToNextConversation,
    setCurrentConversationIndex
}: UseWindowEventsProps) => {
  const [isContentProtected, setIsContentProtected] = useState(false);

  const handleToggleContentProtection = async () => {
    try {
      const result =
        await window.ghostframe.window?.toggleContentProtection?.();
      if (result) {
        setIsContentProtected(result.enabled);
      }
    } catch (error) {
      console.error('Failed to toggle content protection:', error);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'ArrowUp':
            e.preventDefault();
            window.ghostframe.window?.move?.(0, -20);
            break;
          case 'ArrowDown':
            e.preventDefault();
            window.ghostframe.window?.move?.(0, 20);
            break;
          case 'ArrowLeft':
            e.preventDefault();
            if (currentConversationIndex > 0) {
                navigateToPreviousConversation();
            } else {
              window.ghostframe.window?.move?.(-20, 0);
            }
            break;
          case 'ArrowRight':
            e.preventDefault();
            if (currentConversationIndex < conversationsLength - 1) {
                navigateToNextConversation();
            } else {
              window.ghostframe.window?.move?.(20, 0);
            }
            break;
        }
      }
    };

    const handleContentProtectionToggle = (_event: any, enabled: boolean) => {
        setIsContentProtected(enabled);
    };

    const loadContentProtectionStatus = async () => {
        try {
          const status =
            await window.ghostframe.window?.getContentProtectionStatus?.();
          if (status) {
            setIsContentProtected(status.enabled);
          }
        } catch (error) {
          console.error("Failed to load content protection status:", error);
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    if (window.ghostframe?.on) {
        window.ghostframe.on('content-protection-toggled', handleContentProtectionToggle);
    }

    loadContentProtectionStatus();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (window.ghostframe?.off) {
        window.ghostframe.off('content-protection-toggled', handleContentProtectionToggle);
      }
    };
  }, [currentConversationIndex, conversationsLength, navigateToPreviousConversation, navigateToNextConversation, setCurrentConversationIndex]);

  return { isContentProtected, handleToggleContentProtection };
};

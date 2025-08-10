import { useEffect, useRef } from 'react';

export const useScreenshots = (isRecording: boolean) => {
  const screenshotTickerRef = useRef<number | null>(null);

  useEffect(() => {
    const clearTicker = () => {
      if (screenshotTickerRef.current) {
        clearInterval(screenshotTickerRef.current);
        screenshotTickerRef.current = null;
      }
    };

    if (isRecording) {
      clearTicker();
      screenshotTickerRef.current = window.setInterval(() => {
        window.ghostframe.capture?.takeScreenshot?.();
      }, 1000);
    } else {
      clearTicker();
    }

    return clearTicker;
  }, [isRecording]);
};

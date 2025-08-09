import { useState, useRef, useEffect } from 'react';
import { WebAudioCapture } from '../WebAudioCapture';

export const useAudio = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [timer, setTimer] = useState('00:00');
  const intervalRef = useRef<number | null>(null);
  const webAudioCapture = useRef<WebAudioCapture | null>(null);

  const startTimer = () => {
    let seconds = 0;
    intervalRef.current = window.setInterval(() => {
      seconds++;
      const mins = Math.floor(seconds / 60)
        .toString()
        .padStart(2, '0');
      const secs = (seconds % 60).toString().padStart(2, '0');
      setTimer(`${mins}:${secs}`);
    }, 1000);
  };

  const stopTimer = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setTimer('00:00');
  };

  const handleRecordToggle = async () => {
    if (isRecording) {
      try {
        if (webAudioCapture.current?.isActive()) {
          await webAudioCapture.current.stopCapture();
        }
        await window.ghostframe.capture?.stopAudio?.();
        await window.ghostframe.capture?.enableTranscription?.(false);
        stopTimer();
      } catch (error) {
        console.error('Error stopping audio capture:', error);
      }
    } else {
      try {
        let audioStarted = false;
        if (WebAudioCapture.isSupported()) {
          if (!webAudioCapture.current) {
            webAudioCapture.current = new WebAudioCapture();
          }
          const result = await webAudioCapture.current.startCapture();
          if (result.success) {
            audioStarted = true;
          } else {
            alert(
              `Audio Capture Failed:\n\n${result.error}\n\nFalling back to text-only mode.`
            );
          }
        }
        if (!audioStarted) {
          await window.ghostframe.capture?.startAudio?.();
        }
        await window.ghostframe.capture?.enableTranscription?.(true);
        startTimer();
      } catch (error) {
        console.error('Error starting audio capture:', error);
      }
    }
    setIsRecording(!isRecording);
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (webAudioCapture.current?.isActive()) {
        webAudioCapture.current.stopCapture();
      }
    };
  }, []);

  return { isRecording, timer, handleRecordToggle };
};
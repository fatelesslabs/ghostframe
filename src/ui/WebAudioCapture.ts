// Web-based audio capture for Windows (inspired by cheating-daddy)
// This captures system audio using getDisplayMedia API, avoiding the need for FFmpeg

export class WebAudioCapture {
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private audioProcessor: ScriptProcessorNode | null = null;
  private isCapturing = false;

  // Audio configuration matching cheating-daddy
  private static readonly SAMPLE_RATE = 24000;
  private static readonly BUFFER_SIZE = 4096;
  private static readonly AUDIO_CHUNK_DURATION = 0.1; // 100ms chunks like cheating-daddy

  async startCapture(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log("🎤 Starting Windows browser-based audio capture...");

      // Check if already capturing
      if (this.isCapturing) {
        return { success: false, error: "Audio capture already active" };
      }

      // Check if the browser supports the required APIs
      if (!WebAudioCapture.isSupported()) {
        return {
          success: false,
          error: "Browser does not support required audio capture APIs",
        };
      }

      console.log("� Attempting to capture system audio (loopback)...");

      try {
        // First try: Request user media for system audio
        this.mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            sampleRate: WebAudioCapture.SAMPLE_RATE,
            channelCount: 1,
            echoCancellation: false, // Don't cancel system audio
            noiseSuppression: false, // Don't suppress system audio
            autoGainControl: false,
          },
          video: false,
        });

        console.log("✅ Direct system audio capture successful");
      } catch (systemAudioError) {
        console.log(
          "❌ Direct system audio failed, trying microphone as fallback..."
        );

        // Fallback: Use regular microphone input
        this.mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            sampleRate: WebAudioCapture.SAMPLE_RATE,
            channelCount: 1,
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
          video: false,
        });

        console.log("✅ Microphone audio capture successful (fallback)");
      }

      console.log("📊 Audio stream info:", {
        hasAudio: this.mediaStream.getAudioTracks().length > 0,
        audioTracks: this.mediaStream.getAudioTracks().length,
      });

      // Check if we got audio
      if (this.mediaStream.getAudioTracks().length === 0) {
        return {
          success: false,
          error:
            "No audio track available. Please check your audio devices and permissions.",
        };
      }

      // Setup audio processing for Windows loopback audio only (like cheating-daddy)
      this.setupWindowsLoopbackProcessing();
      this.isCapturing = true;

      console.log("🎵 Windows loopback audio capture started successfully");
      return { success: true };
    } catch (error) {
      console.error("❌ Failed to start Windows audio capture:", error);

      // Provide more specific error messages
      let errorMessage = "Unknown error";
      if (error instanceof Error) {
        if (error.name === "NotSupportedError") {
          errorMessage = "Audio capture is not supported in this environment.";
        } else if (error.name === "NotAllowedError") {
          errorMessage =
            "Microphone permission denied. Please allow microphone access and try again.";
        } else if (error.name === "NotFoundError") {
          errorMessage =
            "No audio input devices found. Please check your audio settings.";
        } else if (error.name === "OverconstrainedError") {
          errorMessage =
            "Audio configuration not supported. Using fallback settings.";
        } else {
          errorMessage = error.message;
        }
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Setup audio processing for Windows loopback audio only (like cheating-daddy)
   */
  private setupWindowsLoopbackProcessing(): void {
    if (!this.mediaStream) return;

    // Create audio context with correct sample rate
    this.audioContext = new AudioContext({
      sampleRate: WebAudioCapture.SAMPLE_RATE,
    });
    const source = this.audioContext.createMediaStreamSource(this.mediaStream);
    this.audioProcessor = this.audioContext.createScriptProcessor(
      WebAudioCapture.BUFFER_SIZE,
      1,
      1
    );

    let audioBuffer: number[] = [];
    const samplesPerChunk =
      WebAudioCapture.SAMPLE_RATE * WebAudioCapture.AUDIO_CHUNK_DURATION;

    this.audioProcessor.onaudioprocess = async (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      audioBuffer.push(...inputData);

      // Process audio in 100ms chunks (like cheating-daddy)
      while (audioBuffer.length >= samplesPerChunk) {
        const chunk = audioBuffer.splice(0, samplesPerChunk);

        // Analyze audio data to check if it's actually capturing sound
        const rms = Math.sqrt(
          chunk.reduce((sum, sample) => sum + sample * sample, 0) / chunk.length
        );
        const maxAmplitude = Math.max(...chunk.map(Math.abs));

        // Only send chunks with actual audio content (not silence)
        if (rms > 0.001 || maxAmplitude > 0.01) {
          const pcmData16 = this.convertFloat32ToInt16(chunk);
          const base64Data = this.arrayBufferToBase64(
            pcmData16.buffer as ArrayBuffer
          );

          // Send to AI service
          try {
            console.log(
              `🔊 Sending audio chunk (${
                base64Data.length
              } chars) to Gemini... RMS: ${rms.toFixed(
                4
              )}, Max: ${maxAmplitude.toFixed(4)}`
            );
            const result = await window.ghostframe.ai.sendAudio?.(base64Data);
            console.log("📤 Audio send result:", result);
          } catch (error) {
            console.error("Error sending audio chunk:", error);
          }
        } else {
          // Log silence detection
          console.log(
            `🔇 Skipping silent chunk (RMS: ${rms.toFixed(
              6
            )}, Max: ${maxAmplitude.toFixed(6)})`
          );
        }
      }
    };

    source.connect(this.audioProcessor);
    this.audioProcessor.connect(this.audioContext.destination);
  }

  /**
   * Convert Float32 audio data to Int16 PCM (like cheating-daddy)
   */
  private convertFloat32ToInt16(float32Array: number[]): Int16Array {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      // Clamp to [-1, 1] and convert to 16-bit integer
      const clamped = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = Math.round(clamped * 32767);
    }
    return int16Array;
  }

  /**
   * Convert ArrayBuffer to base64 string (like cheating-daddy)
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  async stopCapture(): Promise<void> {
    console.log("🛑 Stopping Windows audio capture...");

    try {
      // Stop audio processing
      if (this.audioProcessor) {
        this.audioProcessor.disconnect();
        this.audioProcessor = null;
      }

      // Close audio context
      if (this.audioContext) {
        await this.audioContext.close();
        this.audioContext = null;
      }

      // Stop media tracks
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach((track) => track.stop());
        this.mediaStream = null;
      }

      this.isCapturing = false;
      console.log("✅ Windows audio capture stopped");
    } catch (error) {
      console.error("Error stopping audio capture:", error);
    }
  }

  isActive(): boolean {
    return this.isCapturing;
  }

  /**
   * Check if the browser supports the required APIs
   */
  static isSupported(): boolean {
    return !!(
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getDisplayMedia === "function" &&
      window.AudioContext &&
      typeof btoa === "function"
    );
  }
}

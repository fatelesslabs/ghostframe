export interface WebAudioCaptureOptions {
  debug?: boolean;
  useSystemAudio?: boolean; // Try system audio via getDisplayMedia where supported
}

export class WebAudioCapture {
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private isCapturing = false;
  private debug = false;

  // Audio configuration
  private static readonly SAMPLE_RATE = 24000;
  private static readonly AUDIO_CHUNK_DURATION = 0.1; // 100ms chunks

  // Local aggregation buffer
  private pendingBuffer: Float32Array | null = null;
  private pendingLength = 0;

  constructor(opts?: WebAudioCaptureOptions) {
    this.debug = !!opts?.debug;
  }

  async startCapture(
    opts?: WebAudioCaptureOptions
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (typeof opts?.debug === "boolean") this.debug = !!opts.debug;
      const useSystemAudio = !!opts?.useSystemAudio;

      if (this.debug) console.log("🎤 Starting audio capture (web)...");
      if (this.isCapturing) {
        return { success: false, error: "Audio capture already active" };
      }

      if (!WebAudioCapture.isSupported()) {
        return { success: false, error: "Audio APIs not supported" };
      }

      try {
        if (useSystemAudio && WebAudioCapture.canUseDisplayMedia()) {
          // Some Chromium builds allow system audio loopback via getDisplayMedia
          // Note: This will prompt for screen selection. We don't attach video track.
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          this.mediaStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: {
              sampleRate: WebAudioCapture.SAMPLE_RATE,
              channelCount: 1,
            } as any,
          });
          // Remove video tracks to avoid unnecessary processing
          this.mediaStream.getVideoTracks().forEach((t) => t.stop());
        } else {
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
        }
      } catch (err) {
        return { success: false, error: (err as Error).message };
      }

      if (!this.mediaStream || this.mediaStream.getAudioTracks().length === 0) {
        return { success: false, error: "No audio track available" };
      }

      await this.setupProcessing();
      this.isCapturing = true;
      if (this.debug) console.log("🎵 Audio capture started (web)");
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  private async setupProcessing(): Promise<void> {
    if (!this.mediaStream) return;

    this.audioContext = new AudioContext({
      sampleRate: WebAudioCapture.SAMPLE_RATE,
    });

    // Prefer AudioWorklet; fallback to ScriptProcessor only if not available
    if (this.audioContext.audioWorklet) {
      await this.loadInlineWorklet();
      this.workletNode = new AudioWorkletNode(
        this.audioContext,
        "capture-processor",
        { numberOfInputs: 1, numberOfOutputs: 0, channelCount: 1 }
      );
      this.workletNode.port.onmessage = (event) => {
        const chunk = event.data as Float32Array;
        this.handleIncomingSamples(chunk);
      };
      this.sourceNode = this.audioContext.createMediaStreamSource(
        this.mediaStream
      );
      this.sourceNode.connect(this.workletNode);
    } else {
      // Very old fallback (should not be hit on modern Electron)
      const processor = (this.audioContext as any).createScriptProcessor?.(
        4096,
        1,
        1
      );
      if (!processor) throw new Error("AudioWorklet not supported");
      this.sourceNode = this.audioContext.createMediaStreamSource(
        this.mediaStream
      );
      let audioBuffer: number[] = [];
      const samplesPerChunk = Math.floor(
        WebAudioCapture.SAMPLE_RATE * WebAudioCapture.AUDIO_CHUNK_DURATION
      );
      processor.onaudioprocess = async (e: AudioProcessingEvent) => {
        const inputData = e.inputBuffer.getChannelData(0);
        audioBuffer.push(...inputData);
        while (audioBuffer.length >= samplesPerChunk) {
          const chunk = audioBuffer.splice(0, samplesPerChunk);
          await this.maybeSendChunk(new Float32Array(chunk));
        }
      };
      this.sourceNode.connect(processor);
      (this as any).workletNode = processor; // so stopCapture can disconnect
    }
  }

  private handleIncomingSamples(input: Float32Array) {
    const samplesPerChunk = Math.floor(
      WebAudioCapture.SAMPLE_RATE * WebAudioCapture.AUDIO_CHUNK_DURATION
    );

    // Lazy-init buffer
    if (!this.pendingBuffer) {
      this.pendingBuffer = new Float32Array(samplesPerChunk * 2);
      this.pendingLength = 0;
    }

    // Ensure capacity
    if (this.pendingLength + input.length > this.pendingBuffer.length) {
      const next = new Float32Array(
        Math.max(
          this.pendingBuffer.length * 2,
          this.pendingLength + input.length
        )
      );
      next.set(this.pendingBuffer.subarray(0, this.pendingLength), 0);
      this.pendingBuffer = next;
    }
    this.pendingBuffer.set(input, this.pendingLength);
    this.pendingLength += input.length;

    while (this.pendingLength >= samplesPerChunk) {
      const chunk = this.pendingBuffer.subarray(0, samplesPerChunk);
      // Shift left remaining
      const remaining = this.pendingLength - samplesPerChunk;
      if (remaining > 0) {
        this.pendingBuffer.copyWithin(0, samplesPerChunk, this.pendingLength);
      }
      this.pendingLength = remaining;
      // Send chunk
      this.maybeSendChunk(chunk.slice());
    }
  }

  private async maybeSendChunk(chunk: Float32Array) {
    // Silence gate
    const rms = Math.sqrt(
      chunk.reduce((sum, v) => sum + v * v, 0) / chunk.length
    );
    let maxAmplitude = 0;
    for (let i = 0; i < chunk.length; i++) {
      const a = Math.abs(chunk[i]);
      if (a > maxAmplitude) maxAmplitude = a;
    }

    if (rms > 0.001 || maxAmplitude > 0.01) {
      const pcm16 = this.convertFloat32ToInt16(chunk);
      const base64 = this.arrayBufferToBase64(pcm16.buffer as ArrayBuffer);
      try {
        if (this.debug) {
          console.log(
            `🔊 Sending audio chunk (${base64.length} chars) RMS: ${rms.toFixed(
              4
            )}, Max: ${maxAmplitude.toFixed(4)}`
          );
        }
        await window.ghostframe.ai.sendAudio?.(base64);
      } catch (err) {
        console.error("Error sending audio chunk:", err);
      }
    } else if (this.debug) {
      console.log(
        `🔇 Skipping silent chunk (RMS: ${rms.toFixed(
          6
        )}, Max: ${maxAmplitude.toFixed(6)})`
      );
    }
  }

  private async loadInlineWorklet() {
    if (!this.audioContext) return;
    const processorCode = `
      class CaptureProcessor extends AudioWorkletProcessor {
        process(inputs) {
          const input = inputs[0];
          if (input && input[0]) {
            // Copy the channel data to transfer it efficiently
            const channelData = input[0];
            const copy = new Float32Array(channelData.length);
            copy.set(channelData);
            this.port.postMessage(copy, [copy.buffer]);
          }
          return true;
        }
      }
      registerProcessor('capture-processor', CaptureProcessor);
    `;
    const blob = new Blob([processorCode], { type: "application/javascript" });
    const url = URL.createObjectURL(blob);
    try {
      await this.audioContext.audioWorklet.addModule(url);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  private convertFloat32ToInt16(float32Array: ArrayLike<number>): Int16Array {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const clamped = Math.max(-1, Math.min(1, float32Array[i] as number));
      int16Array[i] = Math.round(clamped * 32767);
    }
    return int16Array;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  async stopCapture(): Promise<void> {
    if (this.debug) console.log("🛑 Stopping audio capture (web)...");
    try {
      if (this.workletNode) {
        try {
          this.workletNode.port.onmessage = null as any;
          this.workletNode.disconnect();
        } catch {}
        this.workletNode = null;
      }
      if (this.sourceNode) {
        try {
          this.sourceNode.disconnect();
        } catch {}
        this.sourceNode = null;
      }
      if (this.audioContext) {
        try {
          await this.audioContext.close();
        } catch {}
        this.audioContext = null;
      }
      if (this.mediaStream) {
        try {
          this.mediaStream.getTracks().forEach((t) => t.stop());
        } catch {}
        this.mediaStream = null;
      }
      // Reset local buffers
      this.pendingBuffer = null;
      this.pendingLength = 0;
      this.isCapturing = false;
      if (this.debug) console.log("✅ Audio capture stopped (web)");
    } catch (error) {
      console.error("Error stopping audio capture:", error);
    }
  }

  isActive(): boolean {
    return this.isCapturing;
  }

  static isSupported(): boolean {
    return !!(
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === "function" &&
      (window as any).AudioContext &&
      typeof btoa === "function"
    );
  }

  static canUseDisplayMedia(): boolean {
    return !!(
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getDisplayMedia === "function"
    );
  }
}

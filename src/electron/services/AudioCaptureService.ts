// Migrated AudioCaptureService for new Electron/React setup
import { spawn, ChildProcess } from "child_process";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";

export interface AudioCaptureConfig {
  sampleRate?: number;
  channels?: number;
  bitDepth?: number;
  bufferDuration?: number;
}

export interface AudioData {
  data: string; // base64 encoded
  format: {
    sampleRate: number;
    channels: number;
    bitDepth: number;
  };
  timestamp: number;
}

export class AudioCaptureService {
  private captureProcess: ChildProcess | null = null;
  private isCapturing = false;
  private audioBuffer: Buffer = Buffer.alloc(0);
  private config: Required<AudioCaptureConfig>;
  private onAudioDataCallback: ((data: AudioData) => void) | null = null;
  private onTranscriptionCallback: ((text: string) => void) | null = null;
  private transcriptionEnabled = false;

  constructor() {
    this.config = {
      sampleRate: 24000,
      channels: 1, // Mono for AI processing
      bitDepth: 16,
      bufferDuration: 0.1, // 100ms chunks
    };
  }

  async startCapture(
    config?: AudioCaptureConfig
  ): Promise<{ success: boolean; error?: string }> {
    if (this.isCapturing) {
      return { success: false, error: "Audio capture already active" };
    }

    try {
      this.config = { ...this.config, ...config };

      if (process.platform === "darwin") {
        await this.startMacOSCapture();
      } else if (process.platform === "win32") {
        await this.startWindowsCapture();
      } else {
        await this.startLinuxCapture();
      }

      this.isCapturing = true;
      console.log("Audio capture started");
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async stopCapture(): Promise<{ success: boolean; error?: string }> {
    try {
      if (this.captureProcess) {
        this.captureProcess.kill("SIGTERM");
        this.captureProcess = null;
      }

      this.isCapturing = false;
      this.audioBuffer = Buffer.alloc(0);
      console.log("Audio capture stopped");

      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  setAudioDataCallback(callback: (data: AudioData) => void): void {
    this.onAudioDataCallback = callback;
  }

  setTranscriptionCallback(callback: (text: string) => void): void {
    this.onTranscriptionCallback = callback;
  }

  enableTranscription(enabled: boolean): void {
    this.transcriptionEnabled = enabled;
  }

  private async startMacOSCapture(): Promise<void> {
    // Use built-in macOS audio capture with sox or ffmpeg
    const captureCommand = this.findAudioCaptureCommand();

    if (!captureCommand) {
      throw new Error(
        "No audio capture tool found. Please install sox or ffmpeg."
      );
    }

    let args: string[] = [];

    if (captureCommand.includes("sox")) {
      args = [
        "-t",
        "coreaudio",
        "default",
        "-t",
        "raw",
        "-b",
        this.config.bitDepth.toString(),
        "-e",
        "signed-integer",
        "-r",
        this.config.sampleRate.toString(),
        "-c",
        this.config.channels.toString(),
        "-", // Output to stdout
      ];
    } else if (captureCommand.includes("ffmpeg")) {
      args = [
        "-f",
        "avfoundation",
        "-i",
        ":0", // Default audio input
        "-f",
        "s16le",
        "-ar",
        this.config.sampleRate.toString(),
        "-ac",
        this.config.channels.toString(),
        "-",
      ];
    }

    this.captureProcess = spawn(captureCommand, args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    this.setupAudioProcessing();
  }

  private async startWindowsCapture(): Promise<void> {
    // Use Windows built-in tools or ffmpeg
    const ffmpegPath = this.findFFmpeg();

    if (!ffmpegPath) {
      throw new Error(
        "FFmpeg not found. Please install FFmpeg for audio capture."
      );
    }

    const args = [
      "-f",
      "dshow",
      "-i",
      'audio="Microphone"', // You might need to adjust this
      "-f",
      "s16le",
      "-ar",
      this.config.sampleRate.toString(),
      "-ac",
      this.config.channels.toString(),
      "-",
    ];

    this.captureProcess = spawn(ffmpegPath, args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    this.setupAudioProcessing();
  }

  private async startLinuxCapture(): Promise<void> {
    // Use ALSA or PulseAudio
    let command = "arecord";
    let args = [
      "-f",
      "S16_LE",
      "-r",
      this.config.sampleRate.toString(),
      "-c",
      this.config.channels.toString(),
      "-t",
      "raw",
      "-", // Output to stdout
    ];

    // Try PulseAudio if arecord fails
    try {
      this.captureProcess = spawn(command, args, {
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (error) {
      // Fallback to parecord (PulseAudio)
      command = "parecord";
      args = [
        "--format=s16le",
        "--rate=" + this.config.sampleRate,
        "--channels=" + this.config.channels,
        "--raw",
      ];

      this.captureProcess = spawn(command, args, {
        stdio: ["ignore", "pipe", "pipe"],
      });
    }

    this.setupAudioProcessing();
  }

  private setupAudioProcessing(): void {
    if (!this.captureProcess || !this.captureProcess.stdout) {
      throw new Error("Failed to setup audio capture process");
    }

    const chunkSize = this.calculateChunkSize();

    this.captureProcess.stdout.on("data", (data: Buffer) => {
      this.audioBuffer = Buffer.concat([this.audioBuffer, data]);

      // Process complete chunks
      while (this.audioBuffer.length >= chunkSize) {
        const chunk = this.audioBuffer.slice(0, chunkSize);
        this.audioBuffer = this.audioBuffer.slice(chunkSize);

        // Convert to mono if needed
        const processedChunk = this.processAudioChunk(chunk);

        // Convert to base64 and send
        const audioData: AudioData = {
          data: processedChunk.toString("base64"),
          format: {
            sampleRate: this.config.sampleRate,
            channels: this.config.channels,
            bitDepth: this.config.bitDepth,
          },
          timestamp: Date.now(),
        };

        if (this.onAudioDataCallback) {
          this.onAudioDataCallback(audioData);
        }

        // Send for transcription if enabled
        if (this.transcriptionEnabled && this.onTranscriptionCallback) {
          this.processTranscription(audioData);
        }
      }

      // Limit buffer size to prevent memory issues
      const maxBufferSize =
        this.config.sampleRate *
        (this.config.bitDepth / 8) *
        this.config.channels *
        2; // 2 seconds
      if (this.audioBuffer.length > maxBufferSize) {
        this.audioBuffer = this.audioBuffer.slice(-maxBufferSize);
      }
    });

    this.captureProcess.stderr?.on("data", (data) => {
      console.error("Audio capture error:", data.toString());
    });

    this.captureProcess.on("close", (code) => {
      console.log("Audio capture process closed with code:", code);
      this.isCapturing = false;
    });

    this.captureProcess.on("error", (error) => {
      console.error("Audio capture process error:", error);
      this.isCapturing = false;
    });
  }

  private calculateChunkSize(): number {
    return Math.floor(
      this.config.sampleRate *
        (this.config.bitDepth / 8) *
        this.config.channels *
        this.config.bufferDuration
    );
  }

  private processAudioChunk(chunk: Buffer): Buffer {
    // If stereo, convert to mono by taking left channel
    if (this.config.channels === 2) {
      const samples = chunk.length / 4; // 16-bit stereo = 4 bytes per sample pair
      const monoBuffer = Buffer.alloc(samples * 2); // 16-bit mono = 2 bytes per sample

      for (let i = 0; i < samples; i++) {
        const leftSample = chunk.readInt16LE(i * 4);
        monoBuffer.writeInt16LE(leftSample, i * 2);
      }

      return monoBuffer;
    }

    return chunk;
  }

  private findAudioCaptureCommand(): string | null {
    const commands = ["sox", "ffmpeg"];

    for (const cmd of commands) {
      try {
        const { execSync } = require("child_process");
        execSync(`which ${cmd}`, { stdio: "ignore" });
        return cmd;
      } catch (error) {
        // Command not found, try next
      }
    }

    return null;
  }

  private findFFmpeg(): string | null {
    const possiblePaths = [
      "ffmpeg",
      "C:\\ffmpeg\\bin\\ffmpeg.exe",
      "/usr/local/bin/ffmpeg",
      "/usr/bin/ffmpeg",
    ];

    for (const path of possiblePaths) {
      try {
        if (fs.existsSync(path) || path === "ffmpeg") {
          return path;
        }
      } catch (error) {
        // Continue to next path
      }
    }

    return null;
  }

  getStatus(): { isCapturing: boolean; config: Required<AudioCaptureConfig> } {
    return {
      isCapturing: this.isCapturing,
      config: this.config,
    };
  }

  async cleanup(): Promise<void> {
    await this.stopCapture();
  }

  private async processTranscription(audioData: AudioData): Promise<void> {
    try {
      // Enhanced transcription processing
      // In a real implementation, you would send the audio to a transcription service
      // like Google Speech-to-Text, OpenAI Whisper, or Azure Speech Services

      // For demonstration, we'll create more realistic mock transcription
      const audioLevel = this.analyzeAudioLevel(audioData.data);

      if (audioLevel > 0.1) {
        // Only transcribe if there's significant audio
        const mockPhrases = [
          "Processing audio input...",
          "Detected speech pattern",
          "Analyzing voice data",
          "Transcribing audio stream",
          "Voice activity detected",
          "Converting speech to text",
          "Audio processing active",
        ];

        const randomPhrase =
          mockPhrases[Math.floor(Math.random() * mockPhrases.length)];
        const timestamp = new Date(audioData.timestamp).toLocaleTimeString();
        const transcriptionText = `${randomPhrase} [${timestamp}]`;

        if (this.onTranscriptionCallback) {
          this.onTranscriptionCallback(transcriptionText);
        }
      }
    } catch (error) {
      console.error("Transcription processing error:", error);
    }
  }

  private analyzeAudioLevel(base64Data: string): number {
    try {
      // Simple audio level analysis from base64 data
      const buffer = Buffer.from(base64Data, "base64");
      let sum = 0;
      for (let i = 0; i < buffer.length; i += 2) {
        const sample = buffer.readInt16LE(i);
        sum += Math.abs(sample);
      }
      return sum / (buffer.length / 2) / 32767; // Normalize to 0-1
    } catch {
      return Math.random() * 0.5; // Fallback random level
    }
  }
}

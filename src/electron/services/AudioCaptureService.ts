// Enhanced AudioCaptureService inspired by cheating-daddy-master
import { spawn, ChildProcess } from "child_process";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import { AudioUtils, AudioAnalysis, AudioFormat } from "./AudioUtils.js";

export interface AudioCaptureConfig {
  sampleRate?: number;
  channels?: number;
  bitDepth?: number;
  bufferDuration?: number;
  enableDebug?: boolean;
}

export interface AudioData {
  data: string; // base64 encoded
  format: AudioFormat;
  timestamp: number;
  analysis?: AudioAnalysis;
}

export class AudioCaptureService {
  private captureProcess: ChildProcess | null = null;
  private isCapturing = false;
  private audioBuffer: Buffer = Buffer.alloc(0);
  private config: Required<AudioCaptureConfig>;
  private onAudioDataCallback: ((data: AudioData) => void) | null = null;
  private onTranscriptionCallback: ((text: string) => void) | null = null;
  private transcriptionEnabled = false;

  // Enhanced constants from cheating-daddy implementation
  private static readonly SAMPLE_RATE = 24000;
  private static readonly BUFFER_SIZE = 4096;
  private static readonly AUDIO_CHUNK_DURATION = 0.1; // 100ms chunks

  constructor() {
    this.config = {
      sampleRate: AudioCaptureService.SAMPLE_RATE,
      channels: 1, // Mono for AI processing
      bitDepth: 16,
      bufferDuration: AudioCaptureService.AUDIO_CHUNK_DURATION,
      enableDebug: false,
    };

    // Ensure audio directories exist
    AudioUtils.ensureAudioDirectories();
  }

  async startCapture(
    config?: AudioCaptureConfig
  ): Promise<{ success: boolean; error?: string }> {
    if (this.isCapturing) {
      return { success: false, error: "Audio capture already active" };
    }

    try {
      this.config = { ...this.config, ...config };

      console.log("Starting enhanced audio capture with config:", this.config);

      if (process.platform === "darwin") {
        await this.startMacOSCapture();
      } else if (process.platform === "win32") {
        await this.startWindowsCapture();
      } else {
        await this.startLinuxCapture();
      }

      this.isCapturing = true;
      console.log("✅ Enhanced audio capture started successfully");

      if (this.config.enableDebug) {
        console.log(
          "🔧 Debug mode enabled - audio analysis and logging active"
        );
      }

      return { success: true };
    } catch (error) {
      console.error("❌ Audio capture failed:", error);

      let errorMessage = (error as Error).message;

      // Provide helpful error messages for common issues
      if (errorMessage.includes("ENOENT") && errorMessage.includes("ffmpeg")) {
        errorMessage = `FFmpeg not found. Please install FFmpeg for audio capture. 
        
To install FFmpeg on Windows:
1. Download from https://ffmpeg.org/download.html
2. Extract to C:\\ffmpeg
3. Add C:\\ffmpeg\\bin to your PATH
4. Restart the application`;
      }

      return { success: false, error: errorMessage };
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
    // Try multiple Windows audio capture methods
    const methods = [
      () => this.tryWindowsFFmpeg(),
      () => this.tryWindowsPowershell(),
      () => this.tryWindowsNode(),
    ];

    let lastError: Error | null = null;

    for (const method of methods) {
      try {
        await method();
        console.log("✅ Windows audio capture method succeeded");
        return;
      } catch (error) {
        console.warn("⚠️ Windows audio capture method failed:", error);
        lastError = error as Error;
        continue;
      }
    }

    throw new Error(
      `All Windows audio capture methods failed. Last error: ${lastError?.message}. Please install FFmpeg or use a different audio source.`
    );
  }

  private async tryWindowsFFmpeg(): Promise<void> {
    const ffmpegPath = this.findFFmpeg();
    if (!ffmpegPath) {
      throw new Error("FFmpeg not found");
    }

    // Try to list audio devices first
    console.log("🔍 Detecting Windows audio devices...");

    const args = [
      "-f",
      "dshow",
      "-i",
      "audio=", // Try default audio device
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

  private async tryWindowsPowershell(): Promise<void> {
    // Use PowerShell with Windows Media Format SDK (if available)
    console.log("🔍 Trying PowerShell audio capture...");

    // This is a fallback method - create a simple PowerShell script
    // that can capture audio using Windows APIs
    throw new Error("PowerShell audio capture not implemented yet");
  }

  private async tryWindowsNode(): Promise<void> {
    // Use Node.js audio libraries as fallback
    console.log("🔍 Trying Node.js audio capture...");

    // For now, this method is not implemented
    throw new Error("Node.js audio capture not implemented yet");
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

    // Enhanced chunking inspired by cheating-daddy
    const CHUNK_DURATION = 0.1; // 100ms chunks for real-time processing
    const SAMPLE_RATE = this.config.sampleRate;
    const BYTES_PER_SAMPLE = this.config.bitDepth / 8;
    const CHANNELS = 2; // Assume stereo input, convert to mono
    const CHUNK_SIZE =
      SAMPLE_RATE * BYTES_PER_SAMPLE * CHANNELS * CHUNK_DURATION;

    console.log(
      `Audio chunking: ${CHUNK_DURATION}s chunks, ${CHUNK_SIZE} bytes each`
    );

    this.captureProcess.stdout.on("data", (data: Buffer) => {
      this.audioBuffer = Buffer.concat([this.audioBuffer, data]);

      // Process complete chunks immediately (like cheating-daddy)
      while (this.audioBuffer.length >= CHUNK_SIZE) {
        const chunk = this.audioBuffer.slice(0, CHUNK_SIZE);
        this.audioBuffer = this.audioBuffer.slice(CHUNK_SIZE);

        // Convert stereo to mono (like cheating-daddy)
        const monoChunk = this.convertStereoToMono(chunk);

        // Enhanced audio processing with analysis
        const timestamp = Date.now();
        let analysis: AudioAnalysis | undefined;

        if (this.config.enableDebug) {
          analysis = AudioUtils.analyzeAudioBuffer(monoChunk, "Capture");

          // Save debug audio if it's interesting (not silent)
          if (analysis.silencePercentage < 95) {
            AudioUtils.saveDebugAudio(monoChunk, "capture", timestamp);
          }
        }

        // Real-time feedback like cheating-daddy
        if (this.config.enableDebug) {
          process.stdout.write(".");
        }

        // Convert to base64 and send immediately
        const audioData: AudioData = {
          data: monoChunk.toString("base64"),
          format: {
            sampleRate: this.config.sampleRate,
            channels: 1, // Always mono output
            bitDepth: this.config.bitDepth,
          },
          timestamp,
          analysis,
        };

        if (this.onAudioDataCallback) {
          this.onAudioDataCallback(audioData);
        }

        // Send for transcription if enabled
        if (this.transcriptionEnabled && this.onTranscriptionCallback) {
          this.processTranscription(audioData);
        }
      }

      // Limit buffer size to prevent memory issues (like cheating-daddy)
      const maxBufferSize = SAMPLE_RATE * BYTES_PER_SAMPLE * 1; // 1 second max
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

  /**
   * Convert stereo audio buffer to mono (inspired by cheating-daddy)
   * Takes only the left channel for simplicity and efficiency
   */
  private convertStereoToMono(stereoBuffer: Buffer): Buffer {
    const samples = stereoBuffer.length / 4; // 2 channels * 2 bytes per sample
    const monoBuffer = Buffer.alloc(samples * 2); // 1 channel * 2 bytes per sample

    for (let i = 0; i < samples; i++) {
      // Read left channel sample (16-bit little endian)
      const leftSample = stereoBuffer.readInt16LE(i * 4);
      // Write to mono buffer
      monoBuffer.writeInt16LE(leftSample, i * 2);
    }

    return monoBuffer;
  }

  private processTranscription(audioData: AudioData): void {
    // Enhanced transcription processing with analysis
    if (this.config.enableDebug && audioData.analysis) {
      // Only process audio that's not mostly silent
      if (audioData.analysis.silencePercentage < 80) {
        console.log("🎤 Processing audio for transcription...");
        console.log(`  RMS: ${audioData.analysis.rmsValue.toFixed(2)}`);
        console.log(
          `  Silence: ${audioData.analysis.silencePercentage.toFixed(1)}%`
        );

        // The actual transcription would be handled by the AI service
        if (this.onTranscriptionCallback) {
          // For now, just indicate that we're processing
          this.onTranscriptionCallback("Processing audio...");
        }
      }
    } else if (this.onTranscriptionCallback) {
      // Fallback without analysis
      this.onTranscriptionCallback("Transcribing audio...");
    }
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
      "ffmpeg.exe",
      "C:\\ffmpeg\\bin\\ffmpeg.exe",
      "C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe",
      "C:\\Program Files (x86)\\ffmpeg\\bin\\ffmpeg.exe",
      "/usr/local/bin/ffmpeg",
      "/usr/bin/ffmpeg",
    ];

    for (const path of possiblePaths) {
      try {
        if (fs.existsSync(path)) {
          console.log(`✅ Found FFmpeg at: ${path}`);
          return path;
        }

        // Test if command is available in PATH
        if (path === "ffmpeg" || path === "ffmpeg.exe") {
          const { execSync } = require("child_process");
          execSync(`where ${path}`, { stdio: "ignore" });
          console.log(`✅ Found FFmpeg in PATH: ${path}`);
          return path;
        }
      } catch (error) {
        // Continue to next path
      }
    }

    console.log("❌ FFmpeg not found in any standard location");
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

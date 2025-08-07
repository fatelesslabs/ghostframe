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
  data: string;
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

  constructor() {
    this.config = {
      sampleRate: 24000,
      channels: 1,
      bitDepth: 16,
      bufferDuration: 0.1,
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

  private async startMacOSCapture(): Promise<void> {
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
        "-",
      ];
    } else if (captureCommand.includes("ffmpeg")) {
      args = [
        "-f",
        "avfoundation",
        "-i",
        ":0",
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
      'audio="Microphone"',
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
      "-",
    ];

    try {
      this.captureProcess = spawn(command, args, {
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (error) {
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

      while (this.audioBuffer.length >= chunkSize) {
        const chunk = this.audioBuffer.slice(0, chunkSize);
        this.audioBuffer = this.audioBuffer.slice(chunkSize);

        const processedChunk = this.processAudioChunk(chunk);

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
      }

      const maxBufferSize =
        this.config.sampleRate *
        (this.config.bitDepth / 8) *
        this.config.channels *
        2;
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
    if (this.config.channels === 2) {
      const samples = chunk.length / 4;
      const monoBuffer = Buffer.alloc(samples * 2);

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
}
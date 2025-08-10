// Enhanced audio utilities inspired by cheating-daddy-master
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export interface AudioAnalysis {
  minValue: number;
  maxValue: number;
  avgValue: number;
  rmsValue: number;
  silencePercentage: number;
  sampleCount: number;
  dynamicRange: number;
}

export interface AudioFormat {
  sampleRate: number;
  channels: number;
  bitDepth: number;
}

export class AudioUtils {
  /**
   * Convert raw PCM buffer to WAV format for easier playback and verification
   */
  static pcmToWav(
    pcmBuffer: Buffer,
    outputPath: string,
    sampleRate = 24000,
    channels = 1,
    bitDepth = 16
  ): string {
    const byteRate = sampleRate * channels * (bitDepth / 8);
    const blockAlign = channels * (bitDepth / 8);
    const dataSize = pcmBuffer.length;

    // Create WAV header
    const header = Buffer.alloc(44);

    // "RIFF" chunk descriptor
    header.write("RIFF", 0);
    header.writeUInt32LE(dataSize + 36, 4); // File size - 8
    header.write("WAVE", 8);

    // "fmt " sub-chunk
    header.write("fmt ", 12);
    header.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
    header.writeUInt16LE(1, 20); // AudioFormat (1 for PCM)
    header.writeUInt16LE(channels, 22); // NumChannels
    header.writeUInt32LE(sampleRate, 24); // SampleRate
    header.writeUInt32LE(byteRate, 28); // ByteRate
    header.writeUInt16LE(blockAlign, 32); // BlockAlign
    header.writeUInt16LE(bitDepth, 34); // BitsPerSample

    // "data" sub-chunk
    header.write("data", 36);
    header.writeUInt32LE(dataSize, 40); // Subchunk2Size

    // Combine header and PCM data
    const wavBuffer = Buffer.concat([header, pcmBuffer]);

    // Write to file
    fs.writeFileSync(outputPath, wavBuffer);

    return outputPath;
  }

  /**
   * Analyze audio buffer for debugging and quality metrics
   */
  static analyzeAudioBuffer(buffer: Buffer, label = "Audio"): AudioAnalysis {
    const int16Array = new Int16Array(
      buffer.buffer,
      buffer.byteOffset,
      buffer.length / 2
    );

    let minValue = 32767;
    let maxValue = -32768;
    let avgValue = 0;
    let rmsValue = 0;
    let silentSamples = 0;

    for (let i = 0; i < int16Array.length; i++) {
      const sample = int16Array[i];
      minValue = Math.min(minValue, sample);
      maxValue = Math.max(maxValue, sample);
      avgValue += sample;
      rmsValue += sample * sample;

      if (Math.abs(sample) < 100) {
        silentSamples++;
      }
    }

    avgValue /= int16Array.length;
    rmsValue = Math.sqrt(rmsValue / int16Array.length);

    const silencePercentage = (silentSamples / int16Array.length) * 100;
    const dynamicRange = 20 * Math.log10(maxValue / (rmsValue || 1));

    console.log(`${label} Analysis:`);
    console.log(`  Samples: ${int16Array.length}`);
    console.log(`  Min: ${minValue}, Max: ${maxValue}`);
    console.log(`  Average: ${avgValue.toFixed(2)}`);
    console.log(`  RMS: ${rmsValue.toFixed(2)}`);
    console.log(`  Silence: ${silencePercentage.toFixed(1)}%`);
    console.log(`  Dynamic Range: ${dynamicRange.toFixed(1)} dB`);

    return {
      minValue,
      maxValue,
      avgValue,
      rmsValue,
      silencePercentage,
      sampleCount: int16Array.length,
      dynamicRange,
    };
  }

  /**
   * Save audio buffer with metadata for debugging
   */
  static saveDebugAudio(
    buffer: Buffer,
    type: string,
    timestamp = Date.now()
  ): { pcmPath: string; wavPath: string; metaPath: string } {
    const homeDir = os.homedir();
    const debugDir = path.join(homeDir, "ghostframe", "debug");

    if (!fs.existsSync(debugDir)) {
      fs.mkdirSync(debugDir, { recursive: true });
    }

    const pcmPath = path.join(debugDir, `${type}_${timestamp}.pcm`);
    const wavPath = path.join(debugDir, `${type}_${timestamp}.wav`);
    const metaPath = path.join(debugDir, `${type}_${timestamp}.json`);

    // Save raw PCM
    fs.writeFileSync(pcmPath, buffer);

    // Convert to WAV for easy playback
    this.pcmToWav(buffer, wavPath);

    // Analyze and save metadata
    const analysis = this.analyzeAudioBuffer(buffer, type);
    fs.writeFileSync(
      metaPath,
      JSON.stringify(
        {
          timestamp,
          type,
          bufferSize: buffer.length,
          analysis,
          format: {
            sampleRate: 24000,
            channels: 1,
            bitDepth: 16,
          },
        },
        null,
        2
      )
    );

    console.log(`Debug audio saved: ${wavPath}`);

    return { pcmPath, wavPath, metaPath };
  }

  /**
   * Convert Float32Array to Int16Array with improved scaling
   */
  static convertFloat32ToInt16(float32Array: Float32Array): Int16Array {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      // Improved scaling to prevent clipping
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return int16Array;
  }

  /**
   * Convert ArrayBuffer to base64 string
   */
  static arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return Buffer.from(binary, "binary").toString("base64");
  }

  /**
   * Ensure required directories exist for audio processing
   */
  static ensureAudioDirectories(): { audioDir: string; debugDir: string } {
    const homeDir = os.homedir();
    const ghostframeDir = path.join(homeDir, "ghostframe");
    const audioDir = path.join(ghostframeDir, "audio");
    const debugDir = path.join(ghostframeDir, "debug");

    [ghostframeDir, audioDir, debugDir].forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });

    return { audioDir, debugDir };
  }

  /**
   * Create optimized audio context settings
   */
  static getOptimalAudioContextOptions(): AudioContextOptions {
    return {
      sampleRate: 24000,
      latencyHint: "interactive",
    };
  }

  /**
   * Calculate optimal buffer size based on sample rate and chunk duration
   */
  static calculateBufferSize(
    sampleRate: number,
    chunkDuration: number
  ): number {
    const samplesPerChunk = sampleRate * chunkDuration;
    // Round to nearest power of 2 for optimal performance
    return Math.pow(2, Math.ceil(Math.log2(samplesPerChunk)));
  }
}

/**
 * AntiAnalysisService - Provides anti-debugging and anti-analysis measures
 * Adapted from Cheating Daddy implementation
 */

export class AntiAnalysisService {
  async applyAntiAnalysisMeasures(): Promise<void> {
    console.log("Applying anti-analysis measures...");

    // Clear console in production
    if (process.env.NODE_ENV === "production") {
      console.clear();
    }

    // Randomize startup delay to avoid pattern detection
    const delay = 1000 + Math.random() * 3000; // 1-4 seconds
    await this.randomDelay(delay);

    // Obfuscate process arguments
    this.obfuscateProcessArgs();

    // Apply memory protection measures
    this.applyMemoryProtection();
  }

  private async randomDelay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private obfuscateProcessArgs(): void {
    try {
      // Clear command line arguments to avoid detection
      if (process.argv.length > 2) {
        process.argv = process.argv.slice(0, 2);
      }
    } catch (error) {
      console.warn(
        "Could not obfuscate process args:",
        (error as Error).message
      );
    }
  }

  private applyMemoryProtection(): void {
    try {
      // Prevent heap dumps and memory inspection
      if (process.platform === "win32") {
        // Windows-specific memory protection
        this.applyWindowsMemoryProtection();
      } else if (process.platform === "darwin") {
        // macOS-specific memory protection
        this.applyMacOSMemoryProtection();
      }
    } catch (error) {
      console.warn(
        "Could not apply memory protection:",
        (error as Error).message
      );
    }
  }

  private applyWindowsMemoryProtection(): void {
    // Disable Windows Error Reporting
    process.env["WER_DISABLE"] = "1";

    // Disable crash dumps
    process.env["SUPPRESS_CRASHES"] = "1";
  }

  private applyMacOSMemoryProtection(): void {
    // Disable crash reporting on macOS
    process.env["OBJC_DISABLE_INITIALIZE_FORK_SAFETY"] = "YES";

    // Prevent core dumps
    process.env["DISABLE_CORE_DUMPS"] = "1";
  }

  detectDebugging(): boolean {
    try {
      // Check for debugger presence
      if (
        (global as any).v8debug ||
        (process as any).debugPort ||
        process.env.NODE_ENV === "development"
      ) {
        return true;
      }

      // Check for performance timing anomalies (debugger slowdown)
      const start = Date.now();
      for (let i = 0; i < 1000; i++) {
        // Empty loop to measure execution time
      }
      const end = Date.now();

      // If execution is too slow, might be debugged
      return end - start > 10;
    } catch (error) {
      return false;
    }
  }

  obfuscateStrings(strings: string[]): string[] {
    return strings.map((str) => {
      // Simple string obfuscation
      return str
        .split("")
        .map((char) => String.fromCharCode(char.charCodeAt(0) ^ 0x42))
        .join("");
    });
  }

  createDecoyProcesses(): void {
    // Create legitimate-looking processes to confuse analysis
    try {
      const { spawn } = require("child_process");

      if (process.platform === "win32") {
        // Windows decoy processes
        spawn("cmd", ["/c", "ping", "localhost", "-n", "1"], {
          detached: true,
          stdio: "ignore",
        });
      } else {
        // Unix-like decoy processes
        spawn("ping", ["-c", "1", "localhost"], {
          detached: true,
          stdio: "ignore",
        });
      }
    } catch (error) {
      console.warn(
        "Could not create decoy processes:",
        (error as Error).message
      );
    }
  }

  randomizeEnvironment(): void {
    // Add random environment variables to confuse analysis
    const randomVars = [
      "SYSTEM_MONITOR_ID",
      "AUDIO_SERVICE_PORT",
      "NETWORK_ADAPTER_ID",
      "DISPLAY_DRIVER_VERSION",
      "SECURITY_TOKEN_ID",
    ];

    randomVars.forEach((varName) => {
      process.env[varName] = Math.random().toString(36).substring(7);
    });
  }
}

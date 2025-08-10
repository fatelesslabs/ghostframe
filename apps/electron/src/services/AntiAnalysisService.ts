export class AntiAnalysisService {
  async applyAntiAnalysisMeasures(): Promise<void> {
    console.log("Applying anti-analysis measures...");

    if (process.env.NODE_ENV === "production") {
      console.clear();
    }

    const delay = 1000 + Math.random() * 3000;
    await this.randomDelay(delay);

    this.obfuscateProcessArgs();

    this.applyMemoryProtection();
  }

  private async randomDelay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private obfuscateProcessArgs(): void {
    try {
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
      if (process.platform === "win32") {
        this.applyWindowsMemoryProtection();
      } else if (process.platform === "darwin") {
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
    process.env["WER_DISABLE"] = "1";

    process.env["SUPPRESS_CRASHES"] = "1";
  }

  private applyMacOSMemoryProtection(): void {
    process.env["OBJC_DISABLE_INITIALIZE_FORK_SAFETY"] = "YES";

    process.env["DISABLE_CORE_DUMPS"] = "1";
  }

  detectDebugging(): boolean {
    try {
      if (
        (global as any).v8debug ||
        (process as any).debugPort ||
        process.env.NODE_ENV === "development"
      ) {
        return true;
      }

      const start = Date.now();
      for (let i = 0; i < 1000; i++) {
      }
      const end = Date.now();

      return end - start > 10;
    } catch (error) {
      return false;
    }
  }

  obfuscateStrings(strings: string[]): string[] {
    return strings.map((str) => {
      return str
        .split("")
        .map((char) => String.fromCharCode(char.charCodeAt(0) ^ 0x42))
        .join("");
    });
  }

  createDecoyProcesses(): void {
    try {
      const { spawn } = require("child_process");

      if (process.platform === "win32") {
        spawn("cmd", ["/c", "ping", "localhost", "-n", "1"], {
          detached: true,
          stdio: "ignore",
        });
      } else {
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

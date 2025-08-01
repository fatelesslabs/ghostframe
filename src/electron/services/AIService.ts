// Migrated AIService for new Electron/React setup
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import Store from "electron-store";
import { BrowserWindow } from "electron";

export interface AIConfig {
  provider: "gemini" | "openai" | "claude";
  apiKey: string;
  model?: string;
  customPrompt?: string;
  language?: string;
}

export interface AIResponse {
  success: boolean;
  text?: string;
  error?: string;
}

export class AIService {
  private provider: "gemini" | "openai" | "claude" | null = null;
  private client: any = null;
  private session: any = null;
  private store: Store;
  private conversationHistory: Array<{
    text: string;
    response: string;
    timestamp: number;
  }> = [];

  constructor() {
    this.store = new Store();
  }

  async initialize(config: AIConfig): Promise<AIResponse> {
    try {
      console.log("Initializing AI with config:", config);
      this.provider = config.provider;
      let response: AIResponse;
      switch (config.provider) {
        case "gemini":
          response = await this.initializeGemini(config);
          break;
        case "openai":
          response = await this.initializeOpenAI(config);
          break;
        case "claude":
          response = await this.initializeClaude(config);
          break;
        default:
          return { success: false, error: "Unsupported AI provider" };
      }

      if (response.success && config.apiKey) {
        this.store.set("aiConfig", {
          provider: config.provider,
          apiKey: config.apiKey,
        });
      }
      console.log("AI initialization result:", response);
      return response;
    } catch (error) {
      console.error("Error during AI initialization:", error);
      return { success: false, error: (error as Error).message };
    }
  }

  getStoredConfig(): Partial<AIConfig> {
    return this.store.get("aiConfig", {}) as Partial<AIConfig>;
  }

  private async initializeGemini(config: AIConfig): Promise<AIResponse> {
    try {
      console.log("Initializing Gemini Live session...");

      // Clean up existing session if any
      if (this.session) {
        console.log(
          "Cleaning up existing Gemini session before creating new one"
        );
        try {
          await this.session.close();
        } catch (error) {
          console.warn("Error closing existing session:", error);
        }
        this.session = null;
      }

      this.client = new GoogleGenAI({ apiKey: config.apiKey });

      this.session = await this.client.live.connect({
        model: "gemini-live-2.5-flash-preview",
        callbacks: {
          onopen: () => {
            console.log("Gemini Live session opened successfully.");
            const windows = BrowserWindow.getAllWindows();
            if (windows.length > 0) {
              console.log("Sending ai-status connected to renderer");
              windows[0].webContents.send("ai-status", { status: "connected" });
            } else {
              console.log("No windows found to send ai-status");
            }
          },
          onmessage: (message: any) => {
            console.log(
              "Gemini onmessage callback triggered:",
              JSON.stringify(message, null, 2)
            );
            const windows = BrowserWindow.getAllWindows();
            if (message.serverContent?.modelTurn?.parts) {
              for (const part of message.serverContent.modelTurn.parts) {
                if (part.text && windows.length > 0) {
                  console.log("Sending ai-response with text:", part.text);
                  windows[0].webContents.send("ai-response", {
                    success: true,
                    text: part.text,
                    provider: "gemini",
                  });
                }
              }
            }
            // Forward completion flags so renderer can finalize placeholder
            if (windows.length > 0) {
              if (message.serverContent?.generationComplete) {
                console.log("Sending generationComplete flag");
                windows[0].webContents.send("ai-response", {
                  serverContent: { generationComplete: true },
                });
              }
              if (message.serverContent?.turnComplete) {
                console.log("Sending turnComplete flag");
                windows[0].webContents.send("ai-response", {
                  serverContent: { turnComplete: true },
                });
              }
            }
          },
          onerror: (error: Error) => {
            console.error("Gemini Live session error:", error);
            const windows = BrowserWindow.getAllWindows();
            if (windows.length > 0) {
              windows[0].webContents.send("ai-response", {
                success: false,
                error: error.message,
              });
            }
          },
          onclose: (reason: any) => {
            console.log("Gemini Live session closed. Reason:", reason);
            const windows = BrowserWindow.getAllWindows();
            if (windows.length > 0) {
              windows[0].webContents.send("ai-status", { status: "closed" });
            }
          },
        },
        config: {
          responseModalities: ["TEXT"],
          inputAudioTranscription: {},
          speechConfig: { languageCode: config.language || "en-US" },
          systemInstruction: {
            parts: [{ text: config.customPrompt || this.getDefaultPrompt() }],
          },
        },
      });

      console.log("Gemini Live session initialized successfully.");
      return { success: true };
    } catch (error) {
      console.error("Error initializing Gemini Live:", error);
      return { success: false, error: (error as Error).message };
    }
  }

  private async initializeOpenAI(config: AIConfig): Promise<AIResponse> {
    try {
      this.client = new OpenAI({ apiKey: config.apiKey });
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  private async initializeClaude(config: AIConfig): Promise<AIResponse> {
    try {
      this.client = new Anthropic({ apiKey: config.apiKey });
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async sendMessage(text: string): Promise<AIResponse> {
    console.log(`sendMessage called with text: ${text}`);
    if (!this.client || !this.provider) {
      console.error("AI service not initialized");
      return { success: false, error: "AI service not initialized" };
    }

    try {
      let response: AIResponse;
      switch (this.provider) {
        case "gemini":
          response = await this.sendGeminiMessage(text);
          break;
        case "openai":
          response = await this.sendOpenAIMessage(text);
          break;
        case "claude":
          response = await this.sendClaudeMessage(text);
          break;
        default:
          return { success: false, error: "Unsupported provider" };
      }

      return response;
    } catch (error) {
      const errResponse = { success: false, error: (error as Error).message };
      return errResponse;
    }
  }

  async sendAudio(audioData: string): Promise<AIResponse> {
    if (!this.session && this.provider === "gemini") {
      return { success: false, error: "Gemini session not initialized" };
    }

    try {
      if (this.provider === "gemini") {
        await this.session.sendRealtimeInput({
          audio: {
            data: audioData,
            mimeType: "audio/pcm;rate=24000",
          },
        });
        return { success: true };
      }

      return { success: false, error: "Audio only supported with Gemini Live" };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async sendScreenshot(imageData: string): Promise<AIResponse> {
    try {
      const contextPrompt =
        "Analyze this screenshot and provide helpful insights or answers based on what you see.";

      switch (this.provider) {
        case "gemini":
          if (this.session) {
            await this.session.sendRealtimeInput({
              media: { data: imageData, mimeType: "image/jpeg" },
            });
            return { success: true };
          }
          return { success: false, error: "Gemini session not active" };

        case "openai":
          const response = await this.client.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: contextPrompt },
                  {
                    type: "image_url",
                    image_url: { url: `data:image/jpeg;base64,${imageData}` },
                  },
                ],
              },
            ],
            max_tokens: 1000,
          });

          const aiResponse = response.choices[0]?.message?.content || "";
          this.addToHistory("Screenshot analysis", aiResponse);
          return { success: true, text: aiResponse };

        case "claude":
          const claudeResponse = await this.client.messages.create({
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 1000,
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: contextPrompt },
                  {
                    type: "image",
                    source: {
                      type: "base64",
                      media_type: "image/jpeg",
                      data: imageData,
                    },
                  },
                ],
              },
            ],
          });

          const claudeText =
            claudeResponse.content[0]?.type === "text"
              ? claudeResponse.content[0].text
              : "";
          this.addToHistory("Screenshot analysis", claudeText);
          return { success: true, text: claudeText };

        default:
          return {
            success: false,
            error: "Screenshot analysis not supported for this provider",
          };
      }
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  private async sendGeminiMessage(text: string): Promise<AIResponse> {
    console.log(`sendGeminiMessage called with text: ${text}`);
    try {
      if (this.session) {
        console.log("Sending text to Gemini Live session");
        await this.session.sendRealtimeInput({ text: text.trim() });
        this.addToHistory(text, ""); // Response will be handled by the onmessage callback
        return { success: true };
      }
      console.error("Gemini session not active");
      return { success: false, error: "Gemini session not active" };
    } catch (error) {
      console.error("Error in sendGeminiMessage:", error);
      return { success: false, error: (error as Error).message };
    }
  }

  private async sendOpenAIMessage(text: string): Promise<AIResponse> {
    try {
      const messages = [
        { role: "system" as const, content: this.getDefaultPrompt() },
        ...this.conversationHistory
          .map((h) => [
            { role: "user" as const, content: h.text },
            { role: "assistant" as const, content: h.response },
          ])
          .flat(),
        { role: "user" as const, content: text },
      ];

      const response = await this.client.chat.completions.create({
        model: "gpt-4o",
        messages,
        max_tokens: 1000,
        temperature: 0.7,
      });

      const aiResponse = response.choices[0]?.message?.content || "";
      this.addToHistory(text, aiResponse);
      return { success: true, text: aiResponse };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  private async sendClaudeMessage(text: string): Promise<AIResponse> {
    try {
      const messages = [
        ...this.conversationHistory
          .map((h) => [
            { role: "user" as const, content: h.text },
            { role: "assistant" as const, content: h.response },
          ])
          .flat(),
        { role: "user" as const, content: text },
      ];

      const response = await this.client.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1000,
        system: this.getDefaultPrompt(),
        messages,
      });

      const aiResponse =
        response.content[0]?.type === "text" ? response.content[0].text : "";
      this.addToHistory(text, aiResponse);
      return { success: true, text: aiResponse };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  private addToHistory(text: string, response: string): void {
    this.conversationHistory.push({
      text,
      response,
      timestamp: Date.now(),
    });

    // Keep only last 10 conversations to manage memory
    if (this.conversationHistory.length > 10) {
      this.conversationHistory = this.conversationHistory.slice(-10);
    }
  }

  private getDefaultPrompt(): string {
    return `You are a helpful AI assistant integrated into Ghostframe, a stealth application. Your role is to:

1. Provide instant, accurate answers to questions during interviews, calls, or meetings
2. Analyze screenshots and provide contextual assistance
3. Help with coding problems, technical questions, and general knowledge
4. Be concise but thorough in your responses
5. Maintain a professional and helpful tone

Always prioritize accuracy and relevance. When analyzing screenshots, focus on text, code, questions, or any actionable content visible in the image.`;
  }

  async cleanup(): Promise<void> {
    try {
      if (this.session) {
        await this.session.close();
        this.session = null;
      }
      this.client = null;
      this.provider = null;
      this.conversationHistory = [];
    } catch (error) {
      console.error("Error during AI service cleanup:", error);
    }
  }
}

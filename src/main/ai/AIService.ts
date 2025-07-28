import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

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
  private conversationHistory: Array<{
    text: string;
    response: string;
    timestamp: number;
  }> = [];

  async initialize(config: AIConfig): Promise<AIResponse> {
    try {
      this.provider = config.provider;

      switch (config.provider) {
        case "gemini":
          return await this.initializeGemini(config);
        case "openai":
          return await this.initializeOpenAI(config);
        case "claude":
          return await this.initializeClaude(config);
        default:
          return { success: false, error: "Unsupported AI provider" };
      }
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  private async initializeGemini(config: AIConfig): Promise<AIResponse> {
    try {
      this.client = new GoogleGenAI({
        vertexai: false,
        apiKey: config.apiKey,
      });

      // Initialize Gemini Live session for real-time interaction
      this.session = await this.client.live.connect({
        model: config.model || "gemini-live-2.5-flash-preview",
        callbacks: {
          onopen: () => {
            console.log("Gemini Live session connected");
          },
          onmessage: (message: any) => {
            this.handleGeminiMessage(message);
          },
          onerror: (error: any) => {
            console.error("Gemini error:", error);
          },
          onclose: (reason: any) => {
            console.log("Gemini session closed:", reason);
          },
        },
        config: {
          responseModalities: ["TEXT"],
          inputAudioTranscription: {},
          contextWindowCompression: { slidingWindow: {} },
          speechConfig: { languageCode: config.language || "en-US" },
          systemInstruction: {
            parts: [{ text: config.customPrompt || this.getDefaultPrompt() }],
          },
        },
      });

      return { success: true, text: "Gemini initialized successfully" };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  private async initializeOpenAI(config: AIConfig): Promise<AIResponse> {
    try {
      this.client = new OpenAI({
        apiKey: config.apiKey,
      });

      // Test the connection
      await this.client.models.list();

      return { success: true, text: "OpenAI initialized successfully" };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  private async initializeClaude(config: AIConfig): Promise<AIResponse> {
    try {
      this.client = new Anthropic({
        apiKey: config.apiKey,
      });

      return { success: true, text: "Claude initialized successfully" };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async sendMessage(text: string): Promise<AIResponse> {
    if (!this.client || !this.provider) {
      return { success: false, error: "AI service not initialized" };
    }

    try {
      switch (this.provider) {
        case "gemini":
          return await this.sendGeminiMessage(text);
        case "openai":
          return await this.sendOpenAIMessage(text);
        case "claude":
          return await this.sendClaudeMessage(text);
        default:
          return { success: false, error: "Unsupported provider" };
      }
    } catch (error) {
      return { success: false, error: (error as Error).message };
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
    try {
      if (this.session) {
        await this.session.sendRealtimeInput({ text: text.trim() });
        return { success: true };
      }
      return { success: false, error: "Gemini session not active" };
    } catch (error) {
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

  private handleGeminiMessage(message: any): void {
    // Handle incoming Gemini Live messages
    if (message.serverContent?.modelTurn?.parts) {
      for (const part of message.serverContent.modelTurn.parts) {
        if (part.text) {
          // Send to renderer process
          const { BrowserWindow } = require("electron");
          const windows = BrowserWindow.getAllWindows();
          if (windows.length > 0) {
            windows[0].webContents.send("ai-response", {
              success: true,
              text: part.text,
              provider: "gemini",
            });
          }
        }
      }
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

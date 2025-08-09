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
  profile?:
    | "interview"
    | "sales"
    | "meeting"
    | "presentation"
    | "negotiation"
    | "exam";
  googleSearchEnabled?: boolean;
}

// Profile-based prompts inspired by cheating-daddy
const profilePrompts = {
  interview: {
    intro: `You are an AI-powered interview assistant, designed to act as a discreet on-screen teleprompter. Your mission is to help the user excel in their job interview by providing concise, impactful, and ready-to-speak answers or key talking points. Analyze the ongoing interview dialogue and, crucially, the 'User-provided context' below.`,
    formatRequirements: `**RESPONSE FORMAT REQUIREMENTS:**
- Keep responses SHORT and CONCISE (1-3 sentences max)
- Use **markdown formatting** for better readability
- Use **bold** for key points and emphasis
- Use bullet points (-) for lists when appropriate
- Focus on the most essential information only`,
    content: `Focus on delivering the most essential information the user needs. Your suggestions should be direct and immediately usable.`,
    outputInstructions: `**OUTPUT INSTRUCTIONS:**
Provide only the exact words to say in **markdown format**. No coaching, no "you should" statements, no explanations - just the direct response the candidate can speak immediately. Keep it **short and impactful**.`,
  },
  sales: {
    intro: `You are a sales call assistant. Your job is to provide the exact words the salesperson should say to prospects during sales calls. Give direct, ready-to-speak responses that are persuasive and professional.`,
    formatRequirements: `**RESPONSE FORMAT REQUIREMENTS:**
- Keep responses SHORT and CONCISE (1-3 sentences max)
- Use **markdown formatting** for better readability
- Use **bold** for key points and emphasis
- Focus on the most essential information only`,
    content: `Focus on value propositions, addressing objections, and closing techniques.`,
    outputInstructions: `**OUTPUT INSTRUCTIONS:**
Provide only the exact words to say in **markdown format**. Be persuasive but not pushy. Focus on value and addressing objections directly. Keep responses **short and impactful**.`,
  },
  meeting: {
    intro: `You are a meeting assistant. Your job is to provide the exact words to say during professional meetings, presentations, and discussions. Give direct, ready-to-speak responses that are clear and professional.`,
    formatRequirements: `**RESPONSE FORMAT REQUIREMENTS:**
- Keep responses SHORT and CONCISE (1-3 sentences max)
- Use **markdown formatting** for better readability
- Use **bold** for key points and emphasis
- Focus on the most essential information only`,
    content: `Focus on clear communication, action items, and professional responses.`,
    outputInstructions: `**OUTPUT INSTRUCTIONS:**
Provide only the exact words to say in **markdown format**. Be clear, concise, and action-oriented in your responses. Keep it **short and impactful**.`,
  },
  presentation: {
    intro: `You are a presentation coach. Your job is to provide the exact words the presenter should say during presentations, pitches, and public speaking events. Give direct, ready-to-speak responses that are engaging and confident.`,
    formatRequirements: `**RESPONSE FORMAT REQUIREMENTS:**
- Keep responses SHORT and CONCISE (1-3 sentences max)
- Use **markdown formatting** for better readability
- Use **bold** for key points and emphasis
- Focus on the most essential information only`,
    content: `Focus on engaging delivery, clear explanations, and confident responses to questions.`,
    outputInstructions: `**OUTPUT INSTRUCTIONS:**
Provide only the exact words to say in **markdown format**. Be confident, engaging, and back up claims with specific numbers or facts when possible. Keep responses **short and impactful**.`,
  },
  negotiation: {
    intro: `You are a negotiation assistant. Your job is to provide the exact words to say during business negotiations, contract discussions, and deal-making conversations. Give direct, ready-to-speak responses that are strategic and professional.`,
    formatRequirements: `**RESPONSE FORMAT REQUIREMENTS:**
- Keep responses SHORT and CONCISE (1-3 sentences max)
- Use **markdown formatting** for better readability
- Use **bold** for key points and emphasis
- Focus on the most essential information only`,
    content: `Focus on finding win-win solutions, addressing concerns, and strategic positioning.`,
    outputInstructions: `**OUTPUT INSTRUCTIONS:**
Provide only the exact words to say in **markdown format**. Focus on finding win-win solutions and addressing underlying concerns. Keep responses **short and impactful**.`,
  },
  exam: {
    intro: `You are an exam assistant designed to help students pass tests efficiently. Your role is to provide direct, accurate answers to exam questions with minimal explanation - just enough to confirm the answer is correct.`,
    formatRequirements: `**RESPONSE FORMAT REQUIREMENTS:**
- Keep responses SHORT and CONCISE (1-2 sentences max)
- Use **markdown formatting** for better readability
- Use **bold** for the answer choice/result
- Focus on the most essential information only`,
    content: `Focus on providing efficient exam assistance that helps students pass tests quickly.`,
    outputInstructions: `**OUTPUT INSTRUCTIONS:**
Provide direct exam answers in **markdown format**. Include the question text, the correct answer choice, and a brief justification. Focus on efficiency and accuracy. Keep responses **short and to the point**.`,
  },
};

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
  private currentSessionId: string | null = null;
  private currentTranscription: string = "";
  private messageBuffer: string = "";

  // Enhanced session management inspired by cheating-daddy
  private isInitializingSession = false;
  private reconnectionAttempts = 0;
  private maxReconnectionAttempts = 3;
  private reconnectionDelay = 2000;
  private lastSessionParams: AIConfig | null = null;

  constructor() {
    this.store = new Store();
  }

  /**
   * Build system prompt based on profile (inspired by cheating-daddy)
   */
  private buildSystemPrompt(config: AIConfig): string {
    const profile = config.profile || "interview";
    const promptParts = profilePrompts[profile] || profilePrompts.interview;
    const customPrompt = config.customPrompt || "";

    const sections = [
      promptParts.intro,
      "\n\n",
      promptParts.formatRequirements,
      "\n\n",
      promptParts.content,
      "\n\nUser-provided context\n-----\n",
      customPrompt,
      "\n-----\n\n",
      promptParts.outputInstructions,
    ];

    return sections.join("");
  }

  /**
   * Get enabled tools for Gemini (inspired by cheating-daddy)
   */
  private async getEnabledTools(config: AIConfig): Promise<any[]> {
    const tools = [];

    if (config.googleSearchEnabled !== false) {
      tools.push({ googleSearch: {} });
      console.log("Added Google Search tool");
    }

    return tools;
  }

  /**
   * Send reconnection context (inspired by cheating-daddy)
   */
  private async sendReconnectionContext(): Promise<void> {
    if (!this.session || this.conversationHistory.length === 0) {
      return;
    }

    try {
      const transcriptions = this.conversationHistory
        .map((turn) => turn.text)
        .filter((text) => text && text.trim().length > 0);

      if (transcriptions.length === 0) {
        return;
      }

      // Use cheating-daddy's more effective context message format
      const contextMessage = `Till now all these questions were asked in the interview, answer the last one please:\n\n${transcriptions.join(
        "\n"
      )}`;
      console.log(
        "Sending reconnection context with",
        transcriptions.length,
        "previous questions"
      );

      await this.session.sendRealtimeInput({
        text: contextMessage,
      });
    } catch (error) {
      console.error("Error sending reconnection context:", error);
    }
  }

  /**
   * Attempt automatic reconnection (inspired by cheating-daddy)
   */
  private async attemptReconnection(): Promise<boolean> {
    if (
      !this.lastSessionParams ||
      this.reconnectionAttempts >= this.maxReconnectionAttempts
    ) {
      console.log(
        "Max reconnection attempts reached or no session params stored"
      );
      const windows = BrowserWindow.getAllWindows();
      if (windows.length > 0) {
        windows[0].webContents.send("ai-status", { status: "closed" });
      }
      return false;
    }

    this.reconnectionAttempts++;
    console.log(
      `Attempting reconnection ${this.reconnectionAttempts}/${this.maxReconnectionAttempts}...`
    );

    await new Promise((resolve) => setTimeout(resolve, this.reconnectionDelay));

    try {
      const response = await this.initialize(this.lastSessionParams);
      if (response.success) {
        this.reconnectionAttempts = 0;
        console.log("Live session reconnected");
        await this.sendReconnectionContext();
        return true;
      }
    } catch (error) {
      console.error(
        `Reconnection attempt ${this.reconnectionAttempts} failed:`,
        error
      );
    }

    if (this.reconnectionAttempts < this.maxReconnectionAttempts) {
      return this.attemptReconnection();
    } else {
      console.log("All reconnection attempts failed");
      const windows = BrowserWindow.getAllWindows();
      if (windows.length > 0) {
        windows[0].webContents.send("ai-status", { status: "closed" });
      }
      return false;
    }
  }

  async initialize(config: AIConfig): Promise<AIResponse> {
    try {
      console.log("Initializing AI with config:", config);
      this.provider = config.provider;

      // Store params for potential reconnection
      this.lastSessionParams = config;
      this.reconnectionAttempts = 0;

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
          profile: config.profile,
          googleSearchEnabled: config.googleSearchEnabled,
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

  /**
   * Get current session data (inspired by cheating-daddy)
   */
  getCurrentSessionData(): { sessionId: string | null; history: Array<any> } {
    return {
      sessionId: this.currentSessionId,
      history: this.conversationHistory,
    };
  }

  /**
   * Start new session (inspired by cheating-daddy)
   */
  startNewSession(): void {
    this.initializeNewSession();
  }

  /**
   * Initialize new conversation session (inspired by cheating-daddy)
   */
  private initializeNewSession(): void {
    this.currentSessionId = Date.now().toString();
    this.currentTranscription = "";
    this.conversationHistory = [];
    console.log("New conversation session started:", this.currentSessionId);
  }

  /**
   * Save conversation turn for context tracking (inspired by cheating-daddy)
   */
  private saveConversationTurn(
    transcription: string,
    aiResponse: string
  ): void {
    if (!this.currentSessionId) {
      this.initializeNewSession();
    }

    const conversationTurn = {
      timestamp: Date.now(),
      text: transcription.trim(),
      response: aiResponse.trim(),
    };

    this.conversationHistory.push(conversationTurn);
    console.log("Saved conversation turn:", conversationTurn);

    // Send to renderer for UI updates
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
      windows[0].webContents.send("conversation-turn-saved", {
        sessionId: this.currentSessionId,
        turn: conversationTurn,
        fullHistory: this.conversationHistory,
      });
    }
  }

  private async initializeGemini(config: AIConfig): Promise<AIResponse> {
    try {
      console.log("Initializing Gemini Live session...");

      // Prevent concurrent initializations
      if (this.isInitializingSession) {
        console.log("Session initialization already in progress");
        return { success: false, error: "Session initialization in progress" };
      }

      this.isInitializingSession = true;
      const windows = BrowserWindow.getAllWindows();
      if (windows.length > 0) {
        windows[0].webContents.send("ai-status", { status: "initializing" });
      }

      // Initialize new conversation session
      this.initializeNewSession();

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

      // Get enabled tools and build system prompt
      const enabledTools = await this.getEnabledTools(config);
      const systemPrompt = this.buildSystemPrompt(config);

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

            // Handle transcription input (like cheating-daddy)
            if (message.serverContent?.inputTranscription?.text) {
              this.currentTranscription +=
                message.serverContent.inputTranscription.text;
              console.log(
                `🎤 Transcription received: "${message.serverContent.inputTranscription.text}"`
              );
              console.log(
                `🎤 Full transcription so far: "${this.currentTranscription}"`
              );

              // Send transcription updates to renderer (like cheating-daddy)
              if (windows.length > 0) {
                windows[0].webContents.send(
                  "new-transcription-conversation",
                  this.currentTranscription
                );
              }
            }

            // Handle AI model response
            if (message.serverContent?.modelTurn?.parts) {
              for (const part of message.serverContent.modelTurn.parts) {
                if (part.text) {
                  this.messageBuffer += part.text;
                  console.log(`🤖 AI response part: "${part.text}"`);
                  if (windows.length > 0) {
                    console.log("Sending ai-response with text:", part.text);
                    windows[0].webContents.send("ai-response", {
                      success: true,
                      text: part.text,
                      provider: "gemini",
                    });
                    // Also send cumulative response like cheating-daddy
                    windows[0].webContents.send(
                      "update-response",
                      this.messageBuffer
                    );
                  }
                }
              }
            }

            // Handle completion (like cheating-daddy)
            if (message.serverContent?.generationComplete) {
              console.log(
                `✅ Generation complete! Transcription: "${this.currentTranscription}", Response: "${this.messageBuffer}"`
              );

              // Save conversation turn when we have both transcription and AI response
              if (this.currentTranscription && this.messageBuffer) {
                this.saveConversationTurn(
                  this.currentTranscription,
                  this.messageBuffer
                );
                this.currentTranscription = ""; // Reset for next turn
              }
              this.messageBuffer = "";

              if (windows.length > 0) {
                console.log("Sending generationComplete flag");
                windows[0].webContents.send("ai-response", {
                  serverContent: { generationComplete: true },
                });
              }
            }

            // Forward completion flags so renderer can finalize placeholder
            if (windows.length > 0) {
              if (message.serverContent?.turnComplete) {
                console.log("🔄 Turn complete - AI is ready for next input");
                windows[0].webContents.send("ai-response", {
                  serverContent: { turnComplete: true },
                });
              }
            }
          },
          onerror: (error: Error) => {
            console.error("Gemini Live session error:", error);

            // Check for API key errors
            const isApiKeyError =
              error.message &&
              (error.message.includes("API key not valid") ||
                error.message.includes("invalid API key") ||
                error.message.includes("authentication failed") ||
                error.message.includes("unauthorized"));

            if (isApiKeyError) {
              console.error("Invalid API key detected");
              const windows = BrowserWindow.getAllWindows();
              if (windows.length > 0) {
                windows[0].webContents.send("ai-response", {
                  success: false,
                  error:
                    "Invalid API key. Please check your Gemini API key in settings.",
                });
              }
              return;
            }

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

            // Check for API key errors in close reason
            const isApiKeyError =
              reason &&
              (reason.includes("API key not valid") ||
                reason.includes("invalid API key") ||
                reason.includes("authentication failed") ||
                reason.includes("unauthorized"));

            if (isApiKeyError) {
              console.error("Session closed due to invalid API key");
              const windows = BrowserWindow.getAllWindows();
              if (windows.length > 0) {
                windows[0].webContents.send("ai-status", {
                  status: "error",
                  error: "Invalid API key",
                });
              }
              return;
            }

            // Attempt automatic reconnection for server-side closures
            if (
              this.lastSessionParams &&
              this.reconnectionAttempts < this.maxReconnectionAttempts
            ) {
              console.log("Attempting automatic reconnection...");
              this.attemptReconnection();
            } else {
              const windows = BrowserWindow.getAllWindows();
              if (windows.length > 0) {
                windows[0].webContents.send("ai-status", { status: "closed" });
              }
            }
          },
        },
        config: {
          responseModalities: ["TEXT"],
          tools: enabledTools,
          inputAudioTranscription: {
            enableAutomaticTranscription: true,
          },
          contextWindowCompression: { slidingWindow: {} },
          speechConfig: {
            languageCode: config.language || "en-US",
          },
          systemInstruction: {
            parts: [{ text: systemPrompt }],
          },
        },
      });

      this.isInitializingSession = false;
      console.log("Gemini Live session initialized successfully.");
      return { success: true };
    } catch (error) {
      this.isInitializingSession = false;
      console.error("Error initializing Gemini Live:", error);

      const windows = BrowserWindow.getAllWindows();
      if (windows.length > 0) {
        windows[0].webContents.send("ai-status", { status: "error" });
      }

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
        // Add debug logging to track audio processing
        console.log(
          `🔊 Sending audio chunk (${audioData.length} chars) to Gemini...`
        );

        await this.session.sendRealtimeInput({
          audio: {
            data: audioData,
            mimeType: "audio/pcm;rate=24000",
          },
        });

        // Log successful audio send
        process.stdout.write("🎵");

        return { success: true };
      }

      return { success: false, error: "Audio only supported with Gemini Live" };
    } catch (error) {
      console.error("❌ Error sending audio to Gemini:", error);
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
    return this.buildSystemPrompt({
      provider: "gemini",
      apiKey: "",
      profile: "interview",
      customPrompt:
        "You are a helpful AI assistant integrated into Ghostframe, a stealth application. Your role is to provide instant, accurate answers to questions during interviews, calls, or meetings. Analyze screenshots and provide contextual assistance. Help with coding problems, technical questions, and general knowledge. Be concise but thorough in your responses. Maintain a professional and helpful tone. Always prioritize accuracy and relevance.",
    });
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

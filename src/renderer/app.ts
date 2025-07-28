// Global type declarations for the Ghostframe API
interface GhostframeAPI {
  // AI Service
  ai: {
    initialize: (config: any) => Promise<any>;
    sendMessage: (message: string) => Promise<any>;
    sendAudio: (audioData: any) => Promise<any>;
    sendScreenshot: (imageData: string) => Promise<any>;
  };

  // Automation Service
  automation: {
    startSession: () => Promise<any>;
    stopSession: () => Promise<any>;
    executeAction: (action: any) => Promise<any>;
  };

  // Capture Service
  capture: {
    startAudio: () => Promise<any>;
    stopAudio: () => Promise<any>;
    startPeriodicScreenshots: (interval: number) => Promise<any>;
    stopPeriodicScreenshots: () => Promise<any>;
    takeScreenshot: () => Promise<any>;
  };

  // Window Management
  window: {
    toggleVisibility: () => Promise<any>;
    setMode: (mode: string) => Promise<any>;
    toggleClickThrough: () => Promise<any>;
  };

  // System
  system: {
    quit: () => Promise<any>;
  };

  // Event handling
  on: (channel: string, callback: (...args: any[]) => void) => void;
  off: (channel: string, callback: (...args: any[]) => void) => void;
  send: (channel: string, ...args: any[]) => void;
}

declare global {
  interface Window {
    ghostframe: GhostframeAPI;
  }
}

// Make this file a module
export {};

// Main application class
class GhostframeApp {
  private state = {
    currentMode: "overlay" as "overlay" | "automation",
    isClickThrough: false,
    aiProvider: "gemini" as "gemini" | "openai" | "claude",
    automationSession: null as any,
    responses: [] as any[],
    logs: [] as any[],
  };

  constructor() {
    this.setupEventListeners();
    this.setupIpcHandlers();
    this.render();
  }

  private setupEventListeners() {
    // Global shortcuts handled by main process
    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === "Q") {
        window.ghostframe.window.toggleVisibility();
      }
      if (e.ctrlKey && e.altKey && e.key === "Escape") {
        window.ghostframe.system.quit();
      }
    });

    // IPC event listeners
    window.ghostframe.on("trigger-answer", () => this.handleAnswerTrigger());
    window.ghostframe.on("trigger-automation", () =>
      this.handleAutomationTrigger()
    );
    window.ghostframe.on("click-through-toggled", (enabled: boolean) =>
      this.handleClickThroughToggle(enabled)
    );
    window.ghostframe.on("mode-changed", (mode: string) =>
      this.handleModeChange(mode)
    );
    window.ghostframe.on("ai-response", (response: any) =>
      this.handleAIResponse(response)
    );
  }

  private setupIpcHandlers() {
    // Additional IPC setup if needed
  }

  private async handleModeChange(mode: string) {
    this.state.currentMode = mode as "overlay" | "automation";
    await window.ghostframe.window.setMode(this.state.currentMode);
    this.render();
  }

  private handleClickThroughToggle(enabled: boolean) {
    this.state.isClickThrough = enabled;
    this.render();
  }

  private async switchMode(mode: "overlay" | "automation") {
    this.state.currentMode = mode;
    await window.ghostframe.window.setMode(mode);
    this.render();
  }

  private handleAIResponse(response: any) {
    this.state.responses.unshift({
      timestamp: new Date().toISOString(),
      content: response.content,
      type: response.type || "text",
    });
    this.render();
  }

  private addLog(message: string, type: "info" | "error" | "success" = "info") {
    this.state.logs.unshift({
      timestamp: new Date().toISOString(),
      message,
      type,
    });
    this.render();
  }

  private render() {
    const app = document.getElementById("app");
    if (!app) return;

    app.innerHTML = `
      <div class="app ${this.state.isClickThrough ? "click-through" : ""}">
        ${this.renderHeader()}
        ${this.renderModeSelector()}
        ${this.renderMainContent()}
        ${this.state.isClickThrough ? this.renderClickThroughWarning() : ""}
      </div>
    `;

    this.attachEventListeners();
  }

  private renderHeader() {
    return `
      <div class="header">
        <div class="logo">
          <span class="icon">👻</span>
          <span class="title">Ghostframe</span>
        </div>
        <div class="status">
          <span class="mode-indicator mode-${this.state.currentMode}">
            ${this.state.currentMode.toUpperCase()}
          </span>
          ${
            this.state.isClickThrough
              ? '<span class="click-through-indicator">CLICK-THROUGH</span>'
              : ""
          }
        </div>
      </div>
    `;
  }

  private renderModeSelector() {
    return `
      <div class="mode-selector">
        <button 
          class="mode-btn ${
            this.state.currentMode === "overlay" ? "active" : ""
          }" 
          data-mode="overlay"
        >
          🎯 Cluely Mode
        </button>
        <button 
          class="mode-btn ${
            this.state.currentMode === "automation" ? "active" : ""
          }" 
          data-mode="automation"
        >
          🤖 Automation Mode
        </button>
      </div>
    `;
  }

  private renderMainContent() {
    if (this.state.currentMode === "overlay") {
      return this.renderAIAssistant();
    } else {
      return this.renderBrowserAutomation();
    }
  }

  private renderAIAssistant() {
    return `
      <div class="main-content ai-assistant">
        <div class="section">
          <h3>🧠 AI Configuration</h3>
          <div class="ai-config">
            <div class="provider-selector">
              <label>Provider:</label>
              <select id="ai-provider">
                <option value="gemini" ${
                  this.state.aiProvider === "gemini" ? "selected" : ""
                }>Google Gemini</option>
                <option value="openai" ${
                  this.state.aiProvider === "openai" ? "selected" : ""
                }>OpenAI GPT-4</option>
                <option value="claude" ${
                  this.state.aiProvider === "claude" ? "selected" : ""
                }>Anthropic Claude</option>
              </select>
            </div>
            <div class="api-key-input">
              <label>API Key:</label>
              <input type="password" id="api-key" placeholder="Enter API key..." />
            </div>
            <button id="init-ai" class="btn primary">Initialize AI</button>
          </div>
        </div>

        <div class="section">
          <h3>📹 Capture Configuration</h3>
          <div class="capture-config">
            <div class="audio-controls">
              <button id="start-audio" class="btn secondary">Start Audio Capture</button>
              <button id="stop-audio" class="btn secondary">Stop Audio Capture</button>
            </div>
            <div class="screenshot-controls">
              <label>Screenshot Interval (ms):</label>
              <input type="number" id="screenshot-interval" value="5000" min="1000" max="60000" step="1000" />
              <button id="start-screenshots" class="btn secondary">Start Auto Screenshots</button>
              <button id="stop-screenshots" class="btn secondary">Stop Auto Screenshots</button>
              <button id="take-screenshot" class="btn secondary">Take Screenshot Now</button>
            </div>
          </div>
        </div>

        <div class="section">
          <h3>💬 AI Responses</h3>
          <div class="responses" id="responses">
            ${this.state.responses
              .map(
                (response) => `
              <div class="response">
                <div class="response-meta">
                  <span class="timestamp">${new Date(
                    response.timestamp
                  ).toLocaleTimeString()}</span>
                  <span class="type">${response.type}</span>
                </div>
                <div class="response-content">${response.content}</div>
              </div>
            `
              )
              .join("")}
          </div>
        </div>
      </div>
    `;
  }

  private renderBrowserAutomation() {
    return `
      <div class="main-content browser-automation">
        <div class="section">
          <h3>🌐 Browser Configuration</h3>
          <div class="browser-config">
            <div class="browser-path">
              <label>Chrome/Chromium Path:</label>
              <input type="text" id="browser-path" placeholder="Auto-detect" />
            </div>
            <div class="session-controls">
              <button id="start-session" class="btn primary">Start Browser Session</button>
              <button id="stop-session" class="btn secondary">Stop Session</button>
            </div>
          </div>
        </div>

        <div class="section">
          <h3>⚡ Quick Actions</h3>
          <div class="automation-actions">
            <div class="action-group">
              <label>Navigate to URL:</label>
              <input type="url" id="navigate-url" placeholder="https://example.com" />
              <button id="navigate" class="btn secondary">Navigate</button>
            </div>
            <div class="action-group">
              <label>Click Element:</label>
              <input type="text" id="click-selector" placeholder="CSS selector or text" />
              <button id="click-element" class="btn secondary">Click</button>
            </div>
            <div class="action-group">
              <label>Type Text:</label>
              <input type="text" id="type-selector" placeholder="CSS selector" />
              <input type="text" id="type-text" placeholder="Text to type" />
              <button id="type-text-btn" class="btn secondary">Type</button>
            </div>
            <div class="action-group">
              <button id="take-browser-screenshot" class="btn secondary">Take Browser Screenshot</button>
            </div>
          </div>
        </div>

        <div class="section">
          <h3>📋 Automation Logs</h3>
          <div class="logs" id="logs">
            ${this.state.logs
              .map(
                (log) => `
              <div class="log log-${log.type}">
                <span class="timestamp">${new Date(
                  log.timestamp
                ).toLocaleTimeString()}</span>
                <span class="message">${log.message}</span>
              </div>
            `
              )
              .join("")}
          </div>
        </div>
      </div>
    `;
  }

  private renderClickThroughWarning() {
    return `
      <div class="click-through-warning">
        ⚠️ CLICK-THROUGH MODE ACTIVE ⚠️
        <br>Press Ctrl+Shift+C to disable
      </div>
    `;
  }

  private attachEventListeners() {
    // Mode switching
    document.querySelectorAll(".mode-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const mode = (e.target as HTMLElement).dataset.mode as
          | "overlay"
          | "automation";
        this.switchMode(mode);
      });
    });

    // AI Assistant event listeners
    const initAIBtn = document.getElementById("init-ai");
    if (initAIBtn) {
      initAIBtn.addEventListener("click", () => this.initializeAI());
    }

    const startAudioBtn = document.getElementById("start-audio");
    if (startAudioBtn) {
      startAudioBtn.addEventListener("click", () => this.startAudioCapture());
    }

    const stopAudioBtn = document.getElementById("stop-audio");
    if (stopAudioBtn) {
      stopAudioBtn.addEventListener("click", () => this.stopAudioCapture());
    }

    const startScreenshotsBtn = document.getElementById("start-screenshots");
    if (startScreenshotsBtn) {
      startScreenshotsBtn.addEventListener("click", () =>
        this.startPeriodicScreenshots()
      );
    }

    const stopScreenshotsBtn = document.getElementById("stop-screenshots");
    if (stopScreenshotsBtn) {
      stopScreenshotsBtn.addEventListener("click", () =>
        this.stopPeriodicScreenshots()
      );
    }

    const takeScreenshotBtn = document.getElementById("take-screenshot");
    if (takeScreenshotBtn) {
      takeScreenshotBtn.addEventListener("click", () => this.takeScreenshot());
    }

    // Browser Automation event listeners
    const startSessionBtn = document.getElementById("start-session");
    if (startSessionBtn) {
      startSessionBtn.addEventListener("click", () =>
        this.startBrowserSession()
      );
    }

    const stopSessionBtn = document.getElementById("stop-session");
    if (stopSessionBtn) {
      stopSessionBtn.addEventListener("click", () => this.stopBrowserSession());
    }

    const navigateBtn = document.getElementById("navigate");
    if (navigateBtn) {
      navigateBtn.addEventListener("click", () => this.navigateToUrl());
    }

    const clickElementBtn = document.getElementById("click-element");
    if (clickElementBtn) {
      clickElementBtn.addEventListener("click", () => this.clickElement());
    }

    const typeTextBtn = document.getElementById("type-text-btn");
    if (typeTextBtn) {
      typeTextBtn.addEventListener("click", () => this.typeText());
    }

    const takeBrowserScreenshotBtn = document.getElementById(
      "take-browser-screenshot"
    );
    if (takeBrowserScreenshotBtn) {
      takeBrowserScreenshotBtn.addEventListener("click", () =>
        this.takeBrowserScreenshot()
      );
    }
  }

  // AI Assistant Methods
  private async initializeAI() {
    try {
      const provider = (
        document.getElementById("ai-provider") as HTMLSelectElement
      )?.value;
      const apiKey = (document.getElementById("api-key") as HTMLInputElement)
        ?.value;

      if (!apiKey) {
        this.addLog("Please enter an API key", "error");
        return;
      }

      const result = await window.ghostframe.ai.initialize({
        provider,
        apiKey,
      });

      if (result.success) {
        this.state.aiProvider = provider as any;
        this.addLog(`AI initialized with ${provider}`, "success");
      } else {
        this.addLog(`Failed to initialize AI: ${result.error}`, "error");
      }
    } catch (error) {
      this.addLog(`Error initializing AI: ${error}`, "error");
    }
  }

  private async startAudioCapture() {
    try {
      const result = await window.ghostframe.capture.startAudio();
      if (result.success) {
        this.addLog("Audio capture started", "success");
      } else {
        this.addLog(`Failed to start audio capture: ${result.error}`, "error");
      }
    } catch (error) {
      this.addLog(`Error starting audio capture: ${error}`, "error");
    }
  }

  private async stopAudioCapture() {
    try {
      const result = await window.ghostframe.capture.stopAudio();
      if (result.success) {
        this.addLog("Audio capture stopped", "success");
      }
    } catch (error) {
      this.addLog(`Error stopping audio capture: ${error}`, "error");
    }
  }

  private async startPeriodicScreenshots() {
    try {
      const interval = parseInt(
        (document.getElementById("screenshot-interval") as HTMLInputElement)
          ?.value || "5000"
      );
      const result = await window.ghostframe.capture.startPeriodicScreenshots(
        interval
      );
      if (result.success) {
        this.addLog(`Periodic screenshots started (${interval}ms)`, "success");
      }
    } catch (error) {
      this.addLog(`Error starting periodic screenshots: ${error}`, "error");
    }
  }

  private async stopPeriodicScreenshots() {
    try {
      await window.ghostframe.capture.stopPeriodicScreenshots();
      this.addLog("Periodic screenshots stopped", "success");
    } catch (error) {
      this.addLog(`Error stopping periodic screenshots: ${error}`, "error");
    }
  }

  private async takeScreenshot() {
    try {
      const result = await window.ghostframe.capture.takeScreenshot();
      if (result.success) {
        await window.ghostframe.ai.sendScreenshot(result.data);
        this.addLog("Screenshot taken and sent to AI", "success");
      }
    } catch (error) {
      this.addLog(`Error taking screenshot: ${error}`, "error");
    }
  }

  private async handleAnswerTrigger() {
    this.addLog("Answer trigger activated", "info");
    await this.takeScreenshot();
  }

  private async handleAutomationTrigger() {
    this.addLog("Automation trigger activated", "info");
    // Implement automation trigger logic
  }

  // Browser Automation Methods
  private async startBrowserSession() {
    try {
      const browserPath = (
        document.getElementById("browser-path") as HTMLInputElement
      )?.value;
      const result = await window.ghostframe.automation.startSession();

      if (result.success) {
        this.state.automationSession = result.session;
        this.addLog("Browser automation session started", "success");
      } else {
        this.addLog(`Failed to start session: ${result.error}`, "error");
      }
    } catch (error) {
      this.addLog(`Error starting browser session: ${error}`, "error");
    }
  }

  private async stopBrowserSession() {
    try {
      await window.ghostframe.automation.stopSession();
      this.state.automationSession = null;
      this.addLog("Browser automation session stopped", "success");
    } catch (error) {
      this.addLog(`Error stopping browser session: ${error}`, "error");
    }
  }

  private async navigateToUrl() {
    try {
      const url = (document.getElementById("navigate-url") as HTMLInputElement)
        ?.value;
      if (!url) return;

      const result = await window.ghostframe.automation.executeAction({
        type: "navigate",
        url: url,
      });

      if (result.success) {
        this.addLog(`Navigated to ${url}`, "success");
      } else {
        this.addLog(`Failed to navigate: ${result.error}`, "error");
      }
    } catch (error) {
      this.addLog(`Error navigating: ${error}`, "error");
    }
  }

  private async clickElement() {
    try {
      const selector = (
        document.getElementById("click-selector") as HTMLInputElement
      )?.value;
      if (!selector) return;

      const result = await window.ghostframe.automation.executeAction({
        type: "click",
        selector: selector,
      });

      if (result.success) {
        this.addLog(`Clicked element: ${selector}`, "success");
      } else {
        this.addLog(`Failed to click: ${result.error}`, "error");
      }
    } catch (error) {
      this.addLog(`Error clicking element: ${error}`, "error");
    }
  }

  private async typeText() {
    try {
      const selector = (
        document.getElementById("type-selector") as HTMLInputElement
      )?.value;
      const text = (document.getElementById("type-text") as HTMLInputElement)
        ?.value;
      if (!selector || !text) return;

      const result = await window.ghostframe.automation.executeAction({
        type: "type",
        selector: selector,
        text: text,
      });

      if (result.success) {
        this.addLog(`Typed "${text}" into ${selector}`, "success");
      } else {
        this.addLog(`Failed to type: ${result.error}`, "error");
      }
    } catch (error) {
      this.addLog(`Error typing text: ${error}`, "error");
    }
  }

  private async takeBrowserScreenshot() {
    try {
      const result = await window.ghostframe.automation.executeAction({
        type: "screenshot",
      });

      if (result.success) {
        this.addLog("Browser screenshot taken", "success");
      }
    } catch (error) {
      this.addLog(`Error taking browser screenshot: ${error}`, "error");
    }
  }
}

// Initialize the application when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new GhostframeApp();
});

// Migrated BrowserAutomationService for new Electron/React setup
import * as puppeteer from "puppeteer-core";
import * as path from "path";
import * as fs from "fs";

export interface AutomationAction {
  type:
    | "navigate"
    | "click"
    | "type"
    | "fill"
    | "submit"
    | "scroll"
    | "wait"
    | "screenshot"
    | "extract"
    | "ai_command";
  selector?: string;
  text?: string;
  url?: string;
  command?: string;
  options?: any;
}

export interface AutomationConfig {
  headless?: boolean;
  userDataDir?: string;
  executablePath?: string;
  slowMo?: number;
}

export interface AutomationResponse {
  success: boolean;
  data?: any;
  error?: string;
  screenshot?: string;
}

export class BrowserAutomationService {
  private browser: puppeteer.Browser | null = null;
  private page: puppeteer.Page | null = null;
  private isActive = false;

  async startSession(
    config: AutomationConfig = {}
  ): Promise<AutomationResponse> {
    try {
      if (this.isActive) {
        return { success: false, error: "Automation session already active" };
      }

      // Find Chrome executable
      const executablePath =
        config.executablePath || this.findChromeExecutable();

      if (!executablePath) {
        return {
          success: false,
          error:
            "Chrome executable not found. Please install Chrome or specify path.",
        };
      }

      // Launch browser with realistic settings
      this.browser = await puppeteer.launch({
        headless: config.headless || false, // Default to visible for user monitoring
        executablePath,
        userDataDir: config.userDataDir || this.getDefaultUserDataDir(),
        slowMo: config.slowMo || 50, // Slight delay to appear more human
        defaultViewport: null,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-blink-features=AutomationControlled",
          "--disable-features=VizDisplayCompositor",
          "--start-maximized",
          "--no-first-run",
          "--no-default-browser-check",
          "--disable-extensions-except",
          "--load-extension",
          "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        ],
      });

      // Get the first page or create new one
      const pages = await this.browser.pages();
      this.page = pages.length > 0 ? pages[0] : await this.browser.newPage();

      // Apply stealth measures
      await this.applyStealthMeasures();

      this.isActive = true;
      console.log("Browser automation session started");

      return {
        success: true,
        data: {
          message: "Automation session started",
          url: this.page.url(),
        },
      };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async stopSession(): Promise<AutomationResponse> {
    try {
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
        this.page = null;
        this.isActive = false;
        console.log("Browser automation session stopped");
      }
      return { success: true, data: { message: "Session stopped" } };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async executeAction(action: AutomationAction): Promise<AutomationResponse> {
    if (!this.isActive || !this.page) {
      return { success: false, error: "No active automation session" };
    }

    try {
      switch (action.type) {
        case "navigate":
          return await this.navigate(action.url!);
        case "click":
          return await this.click(action.selector!, action.options);
        case "type":
          return await this.type(
            action.selector!,
            action.text!,
            action.options
          );
        case "fill":
          return await this.fill(
            action.selector!,
            action.text!,
            action.options
          );
        case "submit":
          return await this.submit(action.selector!);
        case "scroll":
          return await this.scroll(action.options);
        case "wait":
          return await this.wait(action.options);
        case "screenshot":
          return await this.takeScreenshot(action.options);
        case "extract":
          return await this.extractData(action.selector!, action.options);
        case "ai_command":
          return await this.executeAICommand(action.command!);
        default:
          return { success: false, error: "Unknown action type" };
      }
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  private async navigate(url: string): Promise<AutomationResponse> {
    if (!this.page) throw new Error("No active page");

    await this.page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // Add random delay to appear human
    await this.humanDelay();

    return {
      success: true,
      data: {
        url: this.page.url(),
        title: await this.page.title(),
      },
    };
  }

  private async click(
    selector: string,
    options: any = {}
  ): Promise<AutomationResponse> {
    if (!this.page) throw new Error("No active page");

    await this.page.waitForSelector(selector, { timeout: 10000 });

    // Add random mouse movement to appear human
    const element = await this.page.$(selector);
    if (element) {
      const box = await element.boundingBox();
      if (box) {
        // Move to element with slight randomization
        await this.page.mouse.move(
          box.x + box.width / 2 + (Math.random() - 0.5) * 10,
          box.y + box.height / 2 + (Math.random() - 0.5) * 10
        );
        await this.humanDelay(100, 300);
      }
    }

    await this.page.click(selector, options);
    await this.humanDelay();

    return { success: true, data: { message: "Element clicked" } };
  }

  private async type(
    selector: string,
    text: string,
    options: any = {}
  ): Promise<AutomationResponse> {
    if (!this.page) throw new Error("No active page");

    await this.page.waitForSelector(selector, { timeout: 10000 });
    await this.page.focus(selector);

    // Clear field first if needed
    if (options.clear !== false) {
      await this.page.click(selector, { clickCount: 3 });
      await this.page.keyboard.press("Backspace");
    }

    // Type with human-like delays
    await this.page.type(selector, text, {
      delay: 50 + Math.random() * 100, // Random typing speed
    });

    await this.humanDelay();

    return { success: true, data: { message: "Text typed", text } };
  }

  private async fill(
    selector: string,
    text: string,
    options: any = {}
  ): Promise<AutomationResponse> {
    if (!this.page) throw new Error("No active page");

    await this.page.waitForSelector(selector, { timeout: 10000 });

    // Use evaluate for faster filling when speed is needed
    await this.page.evaluate(
      (sel, val) => {
        const element = document.querySelector(sel) as
          | HTMLInputElement
          | HTMLTextAreaElement;
        if (element) {
          element.value = val;
          element.dispatchEvent(new Event("input", { bubbles: true }));
          element.dispatchEvent(new Event("change", { bubbles: true }));
        }
      },
      selector,
      text
    );

    await this.humanDelay();

    return { success: true, data: { message: "Field filled", text } };
  }

  private async submit(selector: string): Promise<AutomationResponse> {
    if (!this.page) throw new Error("No active page");

    await this.page.waitForSelector(selector, { timeout: 10000 });

    // Wait for any form validation
    await this.humanDelay(500, 1000);

    await this.page.click(selector);

    // Wait for potential navigation
    await new Promise((resolve) => setTimeout(resolve, 2000));

    return { success: true, data: { message: "Form submitted" } };
  }

  private async scroll(options: any = {}): Promise<AutomationResponse> {
    if (!this.page) throw new Error("No active page");

    const scrollOptions = {
      x: options.x || 0,
      y: options.y || 0,
      ...options,
    };

    await this.page.evaluate((opts) => {
      window.scrollBy(opts.x, opts.y);
    }, scrollOptions);

    await this.humanDelay();

    return {
      success: true,
      data: { message: "Page scrolled", ...scrollOptions },
    };
  }

  private async wait(options: any = {}): Promise<AutomationResponse> {
    if (!this.page) throw new Error("No active page");

    if (options.selector) {
      await this.page.waitForSelector(options.selector, {
        timeout: options.timeout || 10000,
      });
    } else if (options.timeout) {
      await new Promise((resolve) => setTimeout(resolve, options.timeout));
    } else {
      await this.humanDelay(1000, 3000);
    }

    return { success: true, data: { message: "Wait completed" } };
  }

  private async takeScreenshot(options: any = {}): Promise<AutomationResponse> {
    if (!this.page) throw new Error("No active page");

    const screenshot = await this.page.screenshot({
      encoding: "base64",
      fullPage: options.fullPage || false,
      quality: options.quality || 80,
      type: options.type || "jpeg",
      ...options,
    });

    return {
      success: true,
      data: { message: "Screenshot taken" },
      screenshot: screenshot as string,
    };
  }

  private async extractData(
    selector: string,
    options: any = {}
  ): Promise<AutomationResponse> {
    if (!this.page) throw new Error("No active page");

    const data = await this.page.evaluate(
      (sel, opts) => {
        const elements = document.querySelectorAll(sel);
        const results: any[] = [];

        elements.forEach((element) => {
          const item: any = {};

          if (opts.text !== false) {
            item.text = element.textContent?.trim();
          }

          if (opts.html) {
            item.html = element.innerHTML;
          }

          if (opts.attributes) {
            item.attributes = {};
            opts.attributes.forEach((attr: string) => {
              item.attributes[attr] = element.getAttribute(attr);
            });
          }

          results.push(item);
        });

        return results;
      },
      selector,
      options
    );

    return {
      success: true,
      data: {
        message: "Data extracted",
        count: data.length,
        results: data,
      },
    };
  }

  private async executeAICommand(command: string): Promise<AutomationResponse> {
    if (!this.page) throw new Error("No active page");

    try {
      // Analyze the command and determine the appropriate actions
      const plan = this.parseAICommand(command);

      // Execute the planned actions
      let results = [];
      for (const action of plan.actions) {
        const result = await this.executeAction(action);
        results.push(result);

        if (!result.success) {
          break; // Stop on first failure
        }

        // Add delay between actions
        await this.humanDelay(1000, 2000);
      }

      return {
        success: true,
        data: {
          message: `AI Command executed: ${command}`,
          plan: plan.description,
          results: results,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to execute AI command: ${(error as Error).message}`,
      };
    }
  }

  private parseAICommand(command: string): {
    description: string;
    actions: AutomationAction[];
  } {
    const lowerCommand = command.toLowerCase();

    // Academic & Learning Tasks
    if (
      lowerCommand.includes("leetcode") ||
      lowerCommand.includes("coding problem")
    ) {
      return {
        description: "Navigate to LeetCode and assist with problem solving",
        actions: [
          { type: "navigate", url: "https://leetcode.com/problemset/" },
          { type: "wait", options: { timeout: 3000 } },
          { type: "screenshot" },
        ],
      };
    }

    if (
      lowerCommand.includes("hackerrank") ||
      lowerCommand.includes("coding challenge")
    ) {
      return {
        description: "Navigate to HackerRank for coding challenges",
        actions: [
          { type: "navigate", url: "https://www.hackerrank.com/domains" },
          { type: "wait", options: { timeout: 3000 } },
          { type: "screenshot" },
        ],
      };
    }

    if (lowerCommand.includes("canvas") && lowerCommand.includes("quiz")) {
      return {
        description: "Navigate to Canvas LMS for quiz completion",
        actions: [
          { type: "navigate", url: "https://canvas.instructure.com" },
          { type: "wait", options: { timeout: 3000 } },
          { type: "screenshot" },
        ],
      };
    }

    if (
      lowerCommand.includes("form") &&
      (lowerCommand.includes("fill") || lowerCommand.includes("complete"))
    ) {
      return {
        description: "Detect and auto-fill form fields on current page",
        actions: [
          { type: "screenshot" },
          { type: "wait", options: { timeout: 2000 } },
        ],
      };
    }

    if (
      lowerCommand.includes("quiz") ||
      lowerCommand.includes("exam") ||
      lowerCommand.includes("test")
    ) {
      return {
        description: "Assist with online quiz/exam completion",
        actions: [
          { type: "screenshot" },
          { type: "wait", options: { timeout: 2000 } },
        ],
      };
    }

    if (lowerCommand.includes("meeting") && lowerCommand.includes("monitor")) {
      return {
        description: "Monitor meeting and prepare to respond to questions",
        actions: [
          { type: "screenshot" },
          { type: "wait", options: { timeout: 2000 } },
        ],
      };
    }

    // Research & Information Gathering (legacy support)
    if (
      lowerCommand.includes("find") &&
      lowerCommand.includes("price") &&
      lowerCommand.includes("tesla")
    ) {
      return {
        description: "Navigate to Tesla website and find Model 3 pricing",
        actions: [
          { type: "navigate", url: "https://www.tesla.com/model3" },
          { type: "wait", options: { timeout: 3000 } },
          { type: "screenshot" },
        ],
      };
    }

    if (
      lowerCommand.includes("tech news") &&
      lowerCommand.includes("techcrunch")
    ) {
      return {
        description: "Get latest tech news from TechCrunch",
        actions: [
          { type: "navigate", url: "https://techcrunch.com" },
          { type: "wait", options: { timeout: 3000 } },
          { type: "screenshot" },
        ],
      };
    }

    if (lowerCommand.includes("product hunt")) {
      return {
        description: "Browse trending products on Product Hunt",
        actions: [
          { type: "navigate", url: "https://www.producthunt.com" },
          { type: "wait", options: { timeout: 3000 } },
          { type: "screenshot" },
        ],
      };
    }

    if (
      lowerCommand.includes("github") &&
      lowerCommand.includes("notifications")
    ) {
      return {
        description: "Check GitHub notifications and activity",
        actions: [
          { type: "navigate", url: "https://github.com/notifications" },
          { type: "wait", options: { timeout: 3000 } },
          { type: "screenshot" },
        ],
      };
    }

    if (lowerCommand.includes("macbook") && lowerCommand.includes("price")) {
      return {
        description: "Compare MacBook Air M2 prices across retailers",
        actions: [
          { type: "navigate", url: "https://www.apple.com/macbook-air/" },
          { type: "wait", options: { timeout: 3000 } },
          { type: "screenshot" },
        ],
      };
    }

    // E-commerce actions
    if (lowerCommand.includes("amazon") && lowerCommand.includes("airpods")) {
      return {
        description: "Search for AirPods Pro on Amazon",
        actions: [
          { type: "navigate", url: "https://www.amazon.com" },
          { type: "wait", options: { timeout: 2000 } },
          {
            type: "fill",
            selector: "#twotabsearchtextbox",
            text: "AirPods Pro",
          },
          { type: "click", selector: "#nav-search-submit-button" },
          { type: "wait", options: { timeout: 3000 } },
          { type: "screenshot" },
        ],
      };
    }

    // Social Media actions
    if (lowerCommand.includes("twitter") || lowerCommand.includes("tweet")) {
      return {
        description: "Navigate to Twitter for posting or browsing",
        actions: [
          { type: "navigate", url: "https://twitter.com" },
          { type: "wait", options: { timeout: 3000 } },
          { type: "screenshot" },
        ],
      };
    }

    if (lowerCommand.includes("linkedin")) {
      return {
        description: "Navigate to LinkedIn",
        actions: [
          { type: "navigate", url: "https://www.linkedin.com" },
          { type: "wait", options: { timeout: 3000 } },
          { type: "screenshot" },
        ],
      };
    }

    // Learning & Education
    if (lowerCommand.includes("coursera")) {
      return {
        description: "Navigate to Coursera for course browsing",
        actions: [
          { type: "navigate", url: "https://www.coursera.org" },
          { type: "wait", options: { timeout: 3000 } },
          { type: "screenshot" },
        ],
      };
    }

    if (lowerCommand.includes("leetcode")) {
      return {
        description: "Navigate to LeetCode for coding practice",
        actions: [
          { type: "navigate", url: "https://leetcode.com" },
          { type: "wait", options: { timeout: 3000 } },
          { type: "screenshot" },
        ],
      };
    }

    // Productivity tools
    if (lowerCommand.includes("google calendar")) {
      return {
        description: "Navigate to Google Calendar",
        actions: [
          { type: "navigate", url: "https://calendar.google.com" },
          { type: "wait", options: { timeout: 3000 } },
          { type: "screenshot" },
        ],
      };
    }

    if (lowerCommand.includes("notion")) {
      return {
        description: "Navigate to Notion",
        actions: [
          { type: "navigate", url: "https://www.notion.so" },
          { type: "wait", options: { timeout: 3000 } },
          { type: "screenshot" },
        ],
      };
    }

    // Default action - try to navigate to a URL if one is mentioned
    const urlMatch = command.match(/(https?:\/\/[^\s]+)/);
    if (urlMatch) {
      return {
        description: `Navigate to ${urlMatch[1]}`,
        actions: [
          { type: "navigate", url: urlMatch[1] },
          { type: "wait", options: { timeout: 3000 } },
          { type: "screenshot" },
        ],
      };
    }

    // Fallback - take a screenshot of current page
    return {
      description: `Command "${command}" not recognized. Taking screenshot of current page.`,
      actions: [{ type: "screenshot" }],
    };
  }

  private async applyStealthMeasures(): Promise<void> {
    if (!this.page) return;

    // Override webdriver detection
    await this.page.evaluateOnNewDocument(() => {
      // Mock chrome runtime
      (window as any).chrome = {
        runtime: {},
      };

      // Override permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters: any) => {
        if (parameters.name === "notifications") {
          return Promise.resolve({
            state: Notification.permission,
            name: "notifications",
            onchange: null,
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => false,
          } as any);
        }
        return originalQuery(parameters);
      };
    });

    // Set realistic user agent and viewport
    await this.page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    // Set extra headers
    await this.page.setExtraHTTPHeaders({
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
    });
  }

  private async humanDelay(min = 500, max = 1500): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  private findChromeExecutable(): string | null {
    const possiblePaths = [
      // Windows
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      process.env.LOCALAPPDATA + "\\Google\\Chrome\\Application\\chrome.exe",

      // macOS
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",

      // Linux
      "/usr/bin/google-chrome",
      "/usr/bin/google-chrome-stable",
      "/usr/bin/chromium-browser",
      "/snap/bin/chromium",
    ];

    for (const browserPath of possiblePaths) {
      if (browserPath && fs.existsSync(browserPath)) {
        return browserPath;
      }
    }

    return null;
  }

  private getDefaultUserDataDir(): string {
    const homeDir = require("os").homedir();
    return path.join(homeDir, "ghostframe-browser-data");
  }

  async cleanup(): Promise<void> {
    await this.stopSession();
  }
}

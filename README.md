# Ghostframe

**Dual-Feature Stealth AI Assistant + AI Task Automation**

Ghostframe is a cross-platform desktop application that provides two powerful, always-on AI features:

1. **Stealth AI Overlay Assistant** ("Assistant Mode") - Invisible help during calls, interviews, and meetings
2. **AI Task Assistant** ("Automation Mode") - Automated completion of coding problems, forms, quizzes, and routine tasks

## 🌟 Features

### Assistant Mode (Stealth AI Assistant)

- **Invisible Overlay**: Never visible in screen shares, recordings, or screen captures
- **Real-time Audio Capture**: Continuous audio monitoring with configurable buffer
- **Smart Screenshot Analysis**: Periodic or manual screenshot capture with AI analysis
- **Multi-LLM Support**: Works with Google Gemini, OpenAI GPT-4, and Anthropic Claude
- **Instant Answers**: Get immediate help with questions, coding problems, or technical issues
- **Global Shortcuts**: Stealth operation with customizable keyboard shortcuts
- **Privacy-First**: All data processed in-memory with optional export

### Automation Mode (AI Browser Assistant)

- **Natural Language Commands**: Control browsers with conversational instructions
- **Intelligent Task Planning**: AI breaks down complex requests into executable actions
- **Context-Aware Navigation**: Understands intent and navigates to appropriate websites
- **Smart Data Extraction**: Automatically finds and extracts relevant information
- **Multi-Step Workflows**: Executes complex sequences like research, comparison, and test completions.
- **Anti-Detection**: Human-like interaction patterns to avoid bot detection
- **Background Operation**: Run automations while on calls or meetings

## 🔒 Stealth Features

Ghostframe is designed to be completely undetectable:

- **Window Exclusion**: Uses OS-level APIs to exclude from screen capture
- **Process Obfuscation**: Random process names and titles
- **Memory Protection**: Anti-debugging and anti-analysis measures
- **Content Protection**: Built-in screenshot prevention
- **User Agent Randomization**: Realistic browser fingerprints
- **Click-through Mode**: Make overlay completely transparent to interactions

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Chrome/Chromium browser (for automation features)
- API key for at least one AI provider:
  - [Google Gemini API](https://makersuite.google.com/app/apikey)
  - [OpenAI API](https://platform.openai.com/api-keys)
  - [Anthropic Claude API](https://console.anthropic.com/)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-org/ghostframe.git
   cd ghostframe
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Build the application**

   ```bash
   npm run build
   ```

4. **Start Ghostframe**
   ```bash
   npm start
   ```

### Development Mode

```bash
npm run dev
```

## 📖 Usage Guide

### Setting Up Assistant Mode

1. **Launch Ghostframe** and select "Assistant"
2. **Choose AI Provider** from the dropdown in settings (Gemini, OpenAI, or Claude)
3. **Enter API Key** for your chosen provider
4. **Configure Capture Settings**:
   - Enable audio capture for real-time monitoring
   - Set screenshot interval (1-10 seconds or manual)
5. **Start Capture** to begin monitoring

### Using the Stealth Assistant

**Global Shortcuts** (customizable):

- `Ctrl+Enter` (Windows/Linux) or `Cmd+Enter` (Mac): Trigger answer/help
- `Ctrl+\` or `Cmd+\`: Toggle overlay visibility
- `Ctrl+M` or `Cmd+M`: Toggle click-through mode
- `Ctrl+1/2` or `Cmd+1/2`: Switch between modes

**During a call/interview**:

1. Listen for questions or problems
2. Press the answer trigger shortcut
3. AI analyzes current screen and audio context
4. Response appears in the invisible overlay
5. Use the information to answer confidently

### Setting Up AI Task Assistant

1. **Switch to Automation Mode**
2. **Start Browser Session** to launch Chrome
3. **Use AI Commands**:
   - Type natural language requests like "Complete this quiz for me"
   - Use quick action buttons for common tasks
   - Let AI plan and execute multi-step workflows
   - Review results and screenshots automatically captured

**Example AI Commands**:

- "Complete this LeetCode problem for me"
- "Fill out this boring Google Form with my information"
- "Take this quiz on my behalf using the course materials"
- "Monitor this meeting and respond when asked direct questions"

Ghostframe understands your intent and automates tedious tasks, allowing you to focus on more important work while handling routine assignments, forms, and assessments automatically.

### Browser Automation Examples

**Academic & Learning Tasks**:

```bash
"Complete this LeetCode problem step by step"
"Solve this HackerRank coding challenge for me"
"Take this Canvas quiz using my study notes"
"Submit this assignment on Blackboard with the attached file"
"Complete this Khan Academy practice test"
```

**Form Filling & Administrative**:

```bash
"Fill out this job application form with my resume data"
"Complete this boring survey with generic responses"
"Submit this health insurance enrollment form"
"Fill in my weekly timesheet with 8 hours per day"
"Complete this customer feedback form positively"
```

**Meeting & Communication Assistance**:

```bash
"Monitor this Zoom meeting and respond when my name is called"
"Auto-respond in chat when someone asks for status updates"
"Take meeting notes and summarize key action items"
"Participate in this daily standup with standard responses"
"Join this webinar and answer poll questions appropriately"
```

**Content & Automation**:

```bash
"Complete this online training module and pass the final test"
"Submit my daily reports using yesterday's template"
"Auto-respond to routine Slack messages with appropriate replies"
"Complete this compliance training and get the certificate"
"Fill out performance review forms with positive self-assessments"
```

**Exam & Assessment Assistance**:

```bash
"Help me with this online exam by looking up answers"
"Complete this certification test using provided study materials"
"Take this skills assessment and optimize for passing score"
"Answer this technical interview coding challenge"
"Complete this personality test with ideal professional responses"
```

## ⚙️ Configuration

### Global Shortcuts

Customize keyboard shortcuts through the settings panel. Default shortcuts can be modified for your preference and to avoid conflicts.

### AI Providers

**Google Gemini**:

- Best for real-time audio processing
- Supports live conversation context
- Fastest response times

**OpenAI GPT-4**:

- Excellent for complex reasoning
- Great image analysis capabilities
- Comprehensive knowledge base

**Anthropic Claude**:

- Strong safety and ethical guidelines
- Excellent for code analysis
- High-quality text generation

### Privacy Settings

- **Data Retention**: Configure how long responses are kept
- **Audio Buffer**: Set audio capture buffer duration
- **Screenshot Storage**: Enable/disable local screenshot saving
- **Logging Level**: Control verbosity of application logs

## 🛠️ Development

### Project Structure

```
ghostframe/
├── src/
│   ├── main/                 # Electron main process
│   │   ├── index.ts         # Application entry point
│   │   ├── stealth/         # Stealth window management
│   │   ├── ai/              # AI service integration
│   │   ├── automation/      # Browser automation
│   │   ├── capture/         # Audio/screenshot capture
│   │   └── preload/         # Secure IPC bridge
│   ├── renderer/            # UI and frontend logic
│   │   ├── index.html       # Main application window
│   │   ├── app.ts           # Core application logic
│   │   └── styles.css       # UI styling
│   └── shared/              # Shared utilities and types
├── assets/                  # Static assets and icons
└── dist/                    # Compiled JavaScript output
```

### Building from Source

1. **Install development dependencies**

   ```bash
   npm install --dev
   ```

2. **Build TypeScript**

   ```bash
   npm run build
   ```

3. **Package for distribution**

   ```bash
   npm run package
   ```

4. **Create installers**
   ```bash
   npm run make
   ```

### Testing

Run the test suite:

```bash
npm test
```

Test stealth features:

```bash
npm run test:stealth
```

## 🔐 Security Considerations

### Privacy

- All audio processing happens locally or through encrypted API calls
- Screenshots are processed in-memory and not stored permanently
- API keys are stored securely in the local keychain
- No telemetry or tracking

### Stealth

- Designed to be undetectable by proctoring software
- Uses legitimate OS APIs for window management
- Randomized timing and behavior patterns
- No network signatures that indicate automation

### Responsible Use

Ghostframe is intended for:

- ✅ Personal learning and skill development assistance
- ✅ Accessibility support for users with disabilities
- ✅ Automating repetitive administrative tasks
- ✅ Educational purposes and research
- ✅ Legitimate productivity enhancement

Please use responsibly and in accordance with the terms of service of any platforms you interact with. Users are responsible for ensuring their use complies with applicable academic integrity policies, workplace guidelines, and platform terms of service.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-org/ghostframe/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/ghostframe/discussions)
- **Documentation**: [Wiki](https://github.com/your-org/ghostframe/wiki)

## ⚠️ Disclaimer

This software is provided for educational and assistive purposes. Users are responsible for ensuring their use complies with applicable laws, terms of service, and ethical guidelines. The developers assume no responsibility for misuse of this software.

## 🙏 Acknowledgments

- Inspired by stealth overlay techniques from existing tools
- Built with Electron, TypeScript, and modern web technologies
- AI integration powered by leading language model APIs
- Browser automation using Puppeteer and Chrome DevTools Protocol

---

**Made with ❤️ for developers, students, and accessibility advocates**

/**
 * ProcessRandomizer - Generates random legitimate-sounding process names for stealth
 * Adapted from Cheating Daddy implementation
 */

const PREFIXES = [
  "System",
  "Desktop",
  "Audio",
  "Media",
  "Network",
  "Security",
  "Helper",
  "Service",
  "Background",
  "Core",
  "Windows",
  "Microsoft",
  "Apple",
  "Google",
  "Chrome",
  "Firefox",
  "Adobe",
  "Intel",
  "NVIDIA",
  "Driver",
  "Update",
  "Sync",
  "Cloud",
  "Backup",
  "Office",
  "Document",
  "File",
  "Data",
  "Remote",
  "Connection",
  "Stream",
];

const SUFFIXES = [
  "Manager",
  "Service",
  "Helper",
  "Agent",
  "Process",
  "Handler",
  "Monitor",
  "Sync",
  "Update",
  "Assistant",
  "Connector",
  "Bridge",
  "Gateway",
  "Client",
  "Server",
  "Engine",
  "Driver",
  "Daemon",
  "Worker",
  "Scheduler",
  "Controller",
  "Viewer",
  "Player",
  "Editor",
  "Converter",
  "Optimizer",
  "Cleaner",
  "Scanner",
  "Analyzer",
];

const EXTENSIONS = [
  "",
  "Pro",
  "Plus",
  "Lite",
  "Express",
  "Standard",
  "Premium",
  "Advanced",
  "Basic",
  "Essential",
  "Ultimate",
  "Enterprise",
  "2024",
  "365",
  "X",
  "HD",
];

const COMPANIES = [
  "Microsoft",
  "Apple",
  "Google",
  "Adobe",
  "Intel",
  "NVIDIA",
  "HP",
  "Dell",
  "Lenovo",
  "Samsung",
  "LG",
  "Sony",
  "Canon",
  "Epson",
  "Realtek",
  "Qualcomm",
];

const WINDOW_TITLES = [
  "System Configuration",
  "Audio Settings",
  "Network Monitor",
  "Performance Monitor",
  "System Information",
  "Device Manager",
  "Background Services",
  "System Updates",
  "Security Center",
  "Task Manager",
  "Resource Monitor",
  "System Properties",
  "Network Connections",
  "Audio Devices",
  "Display Settings",
  "Power Options",
  "System Tools",
  "Hardware Monitor",
  "Process Monitor",
  "Service Control",
];

export class ProcessRandomizer {
  private currentRandomName: string | null = null;
  private currentRandomDisplayName: string | null = null;

  constructor() {
    this.initializeRandomNames();
  }

  private initializeRandomNames(): void {
    this.currentRandomName = this.generateRandomExecutableName();
    this.currentRandomDisplayName = this.generateRandomProcessName(true);

    // Set process title for task manager stealth
    this.setRandomProcessTitle();

    console.log(`Process name: ${this.currentRandomName}`);
    console.log(`Display name: ${this.currentRandomDisplayName}`);
  }

  generateRandomProcessName(includeCompany = false): string {
    const prefix = PREFIXES[Math.floor(Math.random() * PREFIXES.length)];
    const suffix = SUFFIXES[Math.floor(Math.random() * SUFFIXES.length)];
    const extension =
      Math.random() > 0.7
        ? EXTENSIONS[Math.floor(Math.random() * EXTENSIONS.length)]
        : "";

    let baseName = `${prefix}${suffix}${extension}`;

    if (includeCompany && Math.random() > 0.5) {
      const company = COMPANIES[Math.floor(Math.random() * COMPANIES.length)];
      baseName = `${company} ${baseName}`;
    }

    return baseName;
  }

  generateRandomExecutableName(): string {
    const name = this.generateRandomProcessName(false);
    return name.toLowerCase().replace(/\s+/g, "-");
  }

  generateRandomWindowTitle(): string {
    return WINDOW_TITLES[Math.floor(Math.random() * WINDOW_TITLES.length)];
  }

  getCurrentRandomName(): string {
    if (!this.currentRandomName) {
      this.currentRandomName = this.generateRandomExecutableName();
    }
    return this.currentRandomName;
  }

  getCurrentRandomDisplayName(): string {
    if (!this.currentRandomDisplayName) {
      this.currentRandomDisplayName = this.generateRandomProcessName(true);
    }
    return this.currentRandomDisplayName;
  }

  getRandomCompanyName(): string {
    return COMPANIES[Math.floor(Math.random() * COMPANIES.length)];
  }

  regenerateRandomNames(): void {
    this.currentRandomName = this.generateRandomExecutableName();
    this.currentRandomDisplayName = this.generateRandomProcessName(true);
    this.setRandomProcessTitle();
  }

  private setRandomProcessTitle(): void {
    try {
      const randomProcessName = this.getCurrentRandomName();
      process.title = randomProcessName;
      console.log(`Set process title to: ${randomProcessName}`);
    } catch (error) {
      console.warn("Could not set process title:", (error as Error).message);
    }
  }
}

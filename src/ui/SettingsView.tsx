import React, { useEffect } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

export interface AppSettings {
  provider: "gemini" | "openai" | "claude";
  apiKey: string;
  customInstructions: string;
  profileType: "default" | "custom";
  // Add profile selection for enhanced prompts
  profile?:
    | "interview"
    | "sales"
    | "meeting"
    | "presentation"
    | "negotiation"
    | "exam";
  googleSearchEnabled?: boolean;
  // Add opacity control to settings
  windowOpacity?: number;
}

interface SettingsViewProps {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
}

export const SettingsView = ({ settings, setSettings }: SettingsViewProps) => {
  useEffect(() => {
    const fetchSettings = async () => {
      // Settings loading is handled in the parent component
      // const storedSettings = await window.ghostframe.settings.get();
      // if (storedSettings) {
      //   setSettings(storedSettings);
      // }
    };

    fetchSettings();
  }, [setSettings]);

  const handleSave = async () => {
    await window.ghostframe.settings?.save(settings);
    await window.ghostframe.ai?.initialize?.({
      provider: settings.provider,
      apiKey: settings.apiKey,
      customPrompt: settings.customInstructions,
      profile: settings.profile,
      googleSearchEnabled: settings.googleSearchEnabled,
    });
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value, type } = e.target;
    setSettings((prev) => ({
      ...prev,
      [name]: type === "range" || type === "number" ? Number(value) : value,
    }));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-black/30 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-2xl">
        <h3 className="text-lg font-medium text-white/90 mb-4">
          🧠 AI Configuration
        </h3>
        <div className="space-y-4">
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="provider" className="text-sm text-white/70">
              Provider
            </Label>
            <Select
              value={settings.provider}
              onValueChange={(value) =>
                setSettings((prev) => ({
                  ...prev,
                  provider: value as "gemini" | "openai" | "claude",
                }))
              }
            >
              <SelectTrigger className="col-span-2 bg-white/5 border-white/20 text-white">
                <SelectValue placeholder="Select AI provider" />
              </SelectTrigger>
              <SelectContent className="bg-black/95 border-white/30 text-white">
                <SelectItem
                  value="gemini"
                  className="text-white hover:bg-white/10"
                >
                  Google Gemini
                </SelectItem>
                <SelectItem
                  value="openai"
                  className="text-white hover:bg-white/10"
                >
                  OpenAI GPT-4
                </SelectItem>
                <SelectItem
                  value="claude"
                  className="text-white hover:bg-white/10"
                >
                  Anthropic Claude
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="profile" className="text-sm text-white/70">
              AI Profile
            </Label>
            <Select
              value={settings.profile || "interview"}
              onValueChange={(value) =>
                setSettings((prev) => ({ ...prev, profile: value as any }))
              }
            >
              <SelectTrigger className="col-span-2 bg-white/5 border-white/20 text-white">
                <SelectValue placeholder="Select AI profile" />
              </SelectTrigger>
              <SelectContent className="bg-black/95 border-white/30 text-white">
                <SelectItem
                  value="interview"
                  className="text-white hover:bg-white/10"
                >
                  Interview Assistant
                </SelectItem>
                <SelectItem
                  value="sales"
                  className="text-white hover:bg-white/10"
                >
                  Sales Assistant
                </SelectItem>
                <SelectItem
                  value="meeting"
                  className="text-white hover:bg-white/10"
                >
                  Meeting Assistant
                </SelectItem>
                <SelectItem
                  value="presentation"
                  className="text-white hover:bg-white/10"
                >
                  Presentation Coach
                </SelectItem>
                <SelectItem
                  value="negotiation"
                  className="text-white hover:bg-white/10"
                >
                  Negotiation Assistant
                </SelectItem>
                <SelectItem
                  value="exam"
                  className="text-white hover:bg-white/10"
                >
                  Exam Helper
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="apiKey" className="text-sm text-white/70">
              API Key
            </Label>
            <Input
              type="password"
              id="apiKey"
              name="apiKey"
              value={settings.apiKey}
              onChange={handleInputChange}
              placeholder="Enter your API key"
              className="col-span-2 bg-white/5 border-white/20 text-white placeholder:text-white/40"
            />
          </div>

          <div className="grid grid-cols-3 items-start gap-4">
            <Label
              htmlFor="customInstructions"
              className="text-sm text-white/70 pt-2"
            >
              Custom Instructions
            </Label>
            <Textarea
              id="customInstructions"
              name="customInstructions"
              value={settings.customInstructions}
              onChange={handleInputChange}
              rows={4}
              className="col-span-2 bg-white/5 border-white/20 text-white placeholder:text-white/40"
              placeholder="e.g., Respond in a formal tone."
            />
          </div>

          <div className="grid grid-cols-3 items-center gap-4">
            <Label
              htmlFor="googleSearchEnabled"
              className="text-sm text-white/70"
            >
              Google Search
            </Label>
            <div className="col-span-2 flex items-center space-x-3">
              <Switch
                id="googleSearchEnabled"
                checked={settings.googleSearchEnabled || false}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({
                    ...prev,
                    googleSearchEnabled: checked,
                  }))
                }
                className="data-[state=checked]:bg-blue-500 data-[state=unchecked]:bg-white/20"
              />
              <span className="text-xs text-white/70">
                {settings.googleSearchEnabled ? "Enabled" : "Disabled"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-black/30 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-2xl">
        <h3 className="text-lg font-medium text-white/90 mb-4">
          ⚙️ Capture & Automation Config
        </h3>
        <div className="space-y-4">
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="profileType" className="text-sm text-white/70">
              Browser Profile
            </Label>
            <Select
              value={settings.profileType}
              onValueChange={(value) =>
                setSettings((prev) => ({
                  ...prev,
                  profileType: value as "default" | "custom",
                }))
              }
            >
              <SelectTrigger className="col-span-2 bg-white/5 border-white/20 text-white">
                <SelectValue placeholder="Select browser profile" />
              </SelectTrigger>
              <SelectContent className="bg-black/95 border-white/30 text-white">
                <SelectItem
                  value="default"
                  className="text-white hover:bg-white/10"
                >
                  Default (Clean Profile)
                </SelectItem>
                <SelectItem
                  value="custom"
                  className="text-white hover:bg-white/10"
                >
                  Custom (Use My Profile)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="bg-black/30 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-2xl">
        <h3 className="text-lg font-medium text-white/90 mb-4">
          🎨 UI & Display
        </h3>
        <div className="space-y-4">
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="windowOpacity" className="text-sm text-white/70">
              Window Opacity
            </Label>
            <div className="col-span-2 flex items-center space-x-3">
              <Slider
                value={[settings.windowOpacity || 85]}
                onValueChange={(value) =>
                  setSettings((prev) => ({ ...prev, windowOpacity: value[0] }))
                }
                max={100}
                min={10}
                step={5}
                className="flex-1"
              />
              <span className="text-xs text-white/70 w-12">
                {settings.windowOpacity || 85}%
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          className="bg-blue-500/90 hover:bg-blue-600/90 px-6 py-3"
        >
          <Save className="w-5 h-5 mr-2" />
          <span>Save Settings</span>
        </Button>
      </div>
    </div>
  );
};

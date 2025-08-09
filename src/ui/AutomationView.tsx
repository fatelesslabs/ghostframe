import { useState, useEffect } from "react";
import { Globe, MousePointerClick, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Log {
  message: string;
  timestamp: string;
  type: "success" | "error" | "info";
}

export const AutomationView = () => {
  const [logs, setLogs] = useState<Log[]>([]);
  const [aiCommand, setAiCommand] = useState("");
  const [advancedUrl, setAdvancedUrl] = useState("");
  const [clickSelector, setClickSelector] = useState("");
  const [typeSelector, setTypeSelector] = useState("");
  const [typeText, setTypeText] = useState("");
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [taskStatus, setTaskStatus] = useState<{
    isRunning: boolean;
    currentTask: string;
    progress: "idle" | "thinking" | "working" | "done" | "error";
  }>({
    isRunning: false,
    currentTask: "",
    progress: "idle",
  });

  const handleLogMessage = (
    _event: any,
    message: string,
    type: Log["type"] = "info"
  ) => {
    setLogs((prev) => [
      { message, type, timestamp: new Date().toISOString() },
      ...prev,
    ]);
  };

  useEffect(() => {
    if (window.ghostframe?.on) {
      window.ghostframe.on("log-message", handleLogMessage);
      window.ghostframe.on(
        "automation-session-status",
        (_event: any, active: boolean) => {
          setIsSessionActive(active);
        }
      );
    }
    return () => {
      if (window.ghostframe?.off) {
        window.ghostframe.off("log-message", handleLogMessage);
        window.ghostframe.off(
          "automation-session-status",
          (_event: any, active: boolean) => {
            setIsSessionActive(active);
          }
        );
      }
    };
  }, []);

  const handleAction = async (action: { type: string; [key: string]: any }) => {
    if (!isSessionActive) {
      handleLogMessage(
        null,
        "Please start an automation session first",
        "error"
      );
      return;
    }

    // Update task status with simple progress
    setTaskStatus({
      isRunning: true,
      currentTask: action.command || action.type,
      progress: "thinking",
    });

    try {
      // Show working state
      setTimeout(() => {
        setTaskStatus((prev) => ({ ...prev, progress: "working" }));
      }, 1000);

      const result = await window.ghostframe.automation.executeAction(action);

      if (result.success) {
        setTaskStatus((prev) => ({ ...prev, progress: "done" }));
        setTimeout(() => {
          setTaskStatus({
            isRunning: false,
            currentTask: "",
            progress: "idle",
          });
        }, 2000);
      } else {
        setTaskStatus((prev) => ({ ...prev, progress: "error" }));
        setTimeout(() => {
          setTaskStatus({
            isRunning: false,
            currentTask: "",
            progress: "idle",
          });
        }, 3000);

        handleLogMessage(
          null,
          `Failed to execute ${action.type}: ${result.result?.error}`,
          "error"
        );
      }
    } catch (error) {
      setTaskStatus((prev) => ({ ...prev, progress: "error" }));
      setTimeout(() => {
        setTaskStatus({
          isRunning: false,
          currentTask: "",
          progress: "idle",
        });
      }, 3000);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Session Status */}
      <div className="bg-black/20 backdrop-blur-xl rounded-xl p-6 border border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div
              className={`w-3 h-3 rounded-full ${
                isSessionActive ? "bg-green-400" : "bg-red-400"
              }`}
            ></div>
            <span className="text-base text-white/80">
              {isSessionActive
                ? "Browser session active"
                : "Browser session stopped"}
            </span>
          </div>

          {/* Simple Task Status */}
          {taskStatus.isRunning && (
            <div className="flex items-center space-x-3">
              <div className="flex space-x-1">
                <div
                  className={`w-2 h-2 rounded-full ${
                    taskStatus.progress === "thinking"
                      ? "bg-blue-400 animate-pulse"
                      : taskStatus.progress === "working"
                      ? "bg-blue-400"
                      : taskStatus.progress === "done"
                      ? "bg-green-400"
                      : taskStatus.progress === "error"
                      ? "bg-red-400"
                      : "bg-gray-400"
                  }`}
                ></div>
                <div
                  className={`w-2 h-2 rounded-full ${
                    taskStatus.progress === "working"
                      ? "bg-blue-400 animate-pulse"
                      : taskStatus.progress === "done"
                      ? "bg-green-400"
                      : taskStatus.progress === "error"
                      ? "bg-red-400"
                      : "bg-gray-400"
                  }`}
                ></div>
                <div
                  className={`w-2 h-2 rounded-full ${
                    taskStatus.progress === "done"
                      ? "bg-green-400 animate-pulse"
                      : taskStatus.progress === "error"
                      ? "bg-red-400 animate-pulse"
                      : "bg-gray-400"
                  }`}
                ></div>
              </div>
              <span className="text-sm text-white/60 max-w-32 truncate">
                {taskStatus.currentTask}
              </span>
            </div>
          )}
          <div className="flex space-x-2">
            <Button
              onClick={() => window.ghostframe.automation?.stopSession?.()}
              disabled={!isSessionActive}
              variant="secondary"
              size="sm"
              className="text-sm disabled:opacity-50"
            >
              Stop Session
            </Button>
          </div>
        </div>
      </div>

      {/* AI Browser Assistant */}
      <div className="bg-black/20 backdrop-blur-xl rounded-xl p-6 border border-white/10">
        <h3 className="text-lg font-medium text-white/90 mb-6 flex items-center">
          🤖 AI Browser Assistant
        </h3>
        <div className="space-y-4">
          {/* Natural Language Command */}
          <div className="flex space-x-3">
            <Input
              type="text"
              value={aiCommand}
              onChange={(e) => setAiCommand(e.target.value)}
              placeholder="Tell me what you want to automate... (e.g., 'Complete this LeetCode problem for me')"
              className="flex-grow bg-white/5 border-white/20 text-white placeholder:text-white/40"
            />
            <Button
              onClick={() =>
                handleAction({ type: "ai_command", command: aiCommand })
              }
              disabled={!isSessionActive}
              size="default"
              className="px-6"
            >
              <Globe className="w-4 h-4 mr-2" />
              Execute
            </Button>
          </div>

          {/* Quick Tasks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6">
            <Button
              onClick={() =>
                handleAction({
                  type: "ai_command",
                  command: "Research the latest AI news on TechCrunch",
                })
              }
              variant="outline"
              size="default"
              className="text-left justify-start h-auto py-4 bg-blue-500/20 hover:bg-blue-500/30 border-blue-400/30 text-white"
              disabled={!isSessionActive}
            >
              📰 Get Latest Tech News
            </Button>
            <Button
              onClick={() =>
                handleAction({
                  type: "ai_command",
                  command: "Find trending products on Product Hunt today",
                })
              }
              variant="outline"
              size="default"
              className="text-left justify-start h-auto py-4 bg-green-500/20 hover:bg-green-500/30 border-green-400/30 text-white"
              disabled={!isSessionActive}
            >
              🚀 Browse Product Hunt
            </Button>
            <Button
              onClick={() =>
                handleAction({
                  type: "ai_command",
                  command: "Check my GitHub notifications and recent activity",
                })
              }
              variant="outline"
              size="default"
              className="text-left justify-start h-auto py-4 bg-purple-500/20 hover:bg-purple-500/30 border-purple-400/30 text-white"
              disabled={!isSessionActive}
            >
              💻 GitHub Dashboard
            </Button>
            <Button
              onClick={() =>
                handleAction({
                  type: "ai_command",
                  command:
                    "Compare prices for MacBook Air M2 across major retailers",
                })
              }
              variant="outline"
              size="default"
              className="text-left justify-start h-auto py-4 bg-orange-500/20 hover:bg-orange-500/30 border-orange-400/30 text-white"
              disabled={!isSessionActive}
            >
              🛒 Price Comparison
            </Button>
          </div>

          {/* Advanced Actions */}
          <details className="group mt-6">
            <summary className="cursor-pointer text-sm text-white/70 hover:text-white/90 transition-colors py-2">
              Advanced Actions ⮞
            </summary>
            <div className="mt-4 space-y-3 pl-4 border-l border-white/10">
              {/* Navigate */}
              <div className="flex space-x-3">
                <Input
                  type="url"
                  value={advancedUrl}
                  onChange={(e) => setAdvancedUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="flex-grow bg-white/5 border-white/20 text-white placeholder:text-white/40"
                />
                <Button
                  onClick={() =>
                    handleAction({ type: "navigate", url: advancedUrl })
                  }
                  size="default"
                  disabled={!isSessionActive}
                >
                  <Globe className="w-4 h-4 mr-2" />
                  Navigate
                </Button>
              </div>

              {/* Click Element */}
              <div className="flex space-x-3">
                <Input
                  type="text"
                  value={clickSelector}
                  onChange={(e) => setClickSelector(e.target.value)}
                  placeholder="CSS selector (e.g., #submit-btn, .login-button)"
                  className="flex-grow bg-white/5 border-white/20 text-white placeholder:text-white/40"
                />
                <Button
                  onClick={() =>
                    handleAction({ type: "click", selector: clickSelector })
                  }
                  size="default"
                  disabled={!isSessionActive}
                >
                  <MousePointerClick className="w-4 h-4 mr-2" />
                  Click
                </Button>
              </div>

              {/* Type Text */}
              <div className="flex space-x-3">
                <Input
                  type="text"
                  value={typeSelector}
                  onChange={(e) => setTypeSelector(e.target.value)}
                  placeholder="Input selector"
                  className="flex-1 bg-white/5 border-white/20 text-white placeholder:text-white/40"
                />
                <Input
                  type="text"
                  value={typeText}
                  onChange={(e) => setTypeText(e.target.value)}
                  placeholder="Text to type"
                  className="flex-1 bg-white/5 border-white/20 text-white placeholder:text-white/40"
                />
                <Button
                  onClick={() =>
                    handleAction({
                      type: "type",
                      selector: typeSelector,
                      text: typeText,
                    })
                  }
                  size="default"
                  disabled={!isSessionActive}
                >
                  <Type className="w-4 h-4 mr-2" />
                  Type
                </Button>
              </div>
            </div>
          </details>
        </div>
      </div>

      {/* Activity Log */}
      <div className="bg-black/20 backdrop-blur-xl rounded-xl p-6 border border-white/10">
        <h3 className="text-lg font-medium text-white/90 mb-4 flex items-center">
          📋 Activity Log
        </h3>
        <div className="h-48 overflow-y-auto space-y-3 pr-2">
          {logs.length === 0 && (
            <p className="text-sm text-white/50">No automation activity yet.</p>
          )}
          {logs.map((log) => (
            <div
              key={log.timestamp}
              className={`text-sm p-4 rounded-lg font-mono ${
                log.type === "error"
                  ? "bg-red-500/20 text-red-300 border border-red-400/30"
                  : log.type === "success"
                  ? "bg-green-500/20 text-green-300 border border-green-400/30"
                  : "bg-white/5 text-white/70 border border-white/10"
              }`}
            >
              <span className="mr-3 text-white/40">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
              <span>{log.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

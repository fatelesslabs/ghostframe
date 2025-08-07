import { useState, useEffect } from "react";
import { Globe, MousePointerClick, Type } from "lucide-react";

interface Log {
  message: string;
  timestamp: string;
  type: "success" | "error" | "info";
}

export const AutomationView = () => {
  const [logs, setLogs] = useState<Log[]>([]);
  const [url, setUrl] = useState("");
  const [clickSelector, setClickSelector] = useState("");
  const [typeSelector, setTypeSelector] = useState("");
  const [typeText, setTypeText] = useState("");
  const [isSessionActive, setIsSessionActive] = useState(false);

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

    const result = await window.ghostframe.automation.executeAction(action);
    if (!result.success) {
      handleLogMessage(
        null,
        `Failed to execute ${action.type}: ${result.result?.error}`,
        "error"
      );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-black/30 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-2xl">
        <h3 className="text-lg font-medium text-white/90 mb-4">
          🤖 Automation Controls
        </h3>
        <div className="space-y-4">
          <div className="flex space-x-2">
            <button
              onClick={() => window.ghostframe.automation?.stopSession?.()}
              disabled={!isSessionActive}
              className="action-btn text-xs px-3 py-1 disabled:opacity-50"
            >
              Stop Session
            </button>
          </div>
          <div className="flex space-x-2">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="input-field flex-grow text-sm"
            />
            <button
              onClick={() => handleAction({ type: "navigate", url })}
              className="action-btn px-4"
              disabled={!isSessionActive}
            >
              <Globe className="w-4 h-4" />
              <span className="hidden sm:inline ml-1">Navigate</span>
            </button>
          </div>
          <div className="flex space-x-2">
            <input
              type="text"
              value={clickSelector}
              onChange={(e) => setClickSelector(e.target.value)}
              placeholder="CSS selector (e.g., #submit-btn, .login-button)"
              className="input-field flex-grow text-sm"
            />
            <button
              onClick={() =>
                handleAction({ type: "click", selector: clickSelector })
              }
              className="action-btn px-4"
              disabled={!isSessionActive}
            >
              <MousePointerClick className="w-4 h-4" />
              <span className="hidden sm:inline ml-1">Click</span>
            </button>
          </div>
          <div className="flex space-x-2">
            <input
              type="text"
              value={typeSelector}
              onChange={(e) => setTypeSelector(e.target.value)}
              placeholder="Input selector"
              className="input-field flex-1 text-sm"
            />
            <input
              type="text"
              value={typeText}
              onChange={(e) => setTypeText(e.target.value)}
              placeholder="Text to type"
              className="input-field flex-1 text-sm"
            />
            <button
              onClick={() =>
                handleAction({
                  type: "type",
                  selector: typeSelector,
                  text: typeText,
                })
              }
              className="action-btn px-4"
              disabled={!isSessionActive}
            >
              <Type className="w-4 h-4" />
              <span className="hidden sm:inline ml-1">Type</span>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-black/30 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-2xl">
        <h3 className="text-lg font-medium text-white/90 mb-4">📋 Logs</h3>
        <div className="h-48 overflow-y-auto space-y-2 pr-2">
          {logs.length === 0 && (
            <p className="text-sm text-white/50">No automation activity yet.</p>
          )}
          {logs.map((log) => (
            <div
              key={log.timestamp}
              className={`text-xs p-2 rounded-md font-mono ${
                log.type === "error"
                  ? "bg-red-500/20 text-red-300 border border-red-400/30"
                  : log.type === "success"
                  ? "bg-green-500/20 text-green-300 border border-green-400/30"
                  : "bg-white/5 text-white/70 border border-white/10"
              }`}
            >
              <span className="mr-2 text-white/40">
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

import { useState, useEffect } from "react";
import { Play, Square, Globe, MousePointerClick, Type } from "lucide-react";

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
    }
    return () => {
      if (window.ghostframe?.off) {
        window.ghostframe.off("log-message", handleLogMessage);
      }
    };
  }, []);

  const handleAction = async (action: { type: string; [key: string]: any }) => {
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
              onClick={() => window.ghostframe.automation.startSession()}
              className="btn-secondary flex-1"
            >
              <Play className="w-4 h-4 mr-2" />
              Start Session
            </button>
            <button
              onClick={() => window.ghostframe.automation.stopSession()}
              className="btn-secondary flex-1"
            >
              <Square className="w-4 h-4 mr-2" />
              Stop Session
            </button>
          </div>
          <div className="flex space-x-2">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="input-field flex-grow"
            />
            <button
              onClick={() => handleAction({ type: "navigate", url })}
              className="btn-secondary"
            >
              <Globe className="w-4 h-4" /> Navigate
            </button>
          </div>
          <div className="flex space-x-2">
            <input
              type="text"
              value={clickSelector}
              onChange={(e) => setClickSelector(e.target.value)}
              placeholder="CSS selector, e.g., #submit-btn"
              className="input-field flex-grow"
            />
            <button
              onClick={() =>
                handleAction({ type: "click", selector: clickSelector })
              }
              className="btn-secondary"
            >
              <MousePointerClick className="w-4 h-4" /> Click
            </button>
          </div>
          <div className="flex space-x-2">
            <input
              type="text"
              value={typeSelector}
              onChange={(e) => setTypeSelector(e.target.value)}
              placeholder="Selector"
              className="input-field flex-1"
            />
            <input
              type="text"
              value={typeText}
              onChange={(e) => setTypeText(e.target.value)}
              placeholder="Text to type"
              className="input-field flex-1"
            />
            <button
              onClick={() =>
                handleAction({
                  type: "type",
                  selector: typeSelector,
                  text: typeText,
                })
              }
              className="btn-secondary"
            >
              <Type className="w-4 h-4" /> Type
            </button>
          </div>
        </div>
      </div>

      <div className="bg-black/30 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-2xl">
        <h3 className="text-lg font-medium text-white/90 mb-4">📋 Logs</h3>
        <div className="h-48 overflow-y-auto space-y-2 pr-2">
          {logs.length === 0 && (
            <p className="text-sm text-white/50">No automation logs yet.</p>
          )}
          {logs.map((log) => (
            <div
              key={log.timestamp}
              className={`text-xs p-2 rounded-md font-mono ${
                log.type === "error"
                  ? "bg-red-500/20 text-red-300"
                  : "bg-white/5 text-white/70"
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

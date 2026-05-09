"use client";

import { useState, useMemo } from "react";
import { useChat } from "@ai-sdk/react";
import { TransformersUIMessage } from "@browser-ai/transformers-js";
import { TransformersChatTransport } from "./chat-transport";
import { MODELS, ModelConfig } from "./models";
import { useModelLoader, ModelState } from "./use-model-loader";

// Component to render text with collapsible <think> blocks
function TextWithThinking({ text }: { text: string }) {
  const [showThinking, setShowThinking] = useState(false);

  // Parse out <think>...</think> blocks
  const thinkRegex = /<think>([\s\S]*?)<\/think>/g;
  const thinkMatches = [...text.matchAll(thinkRegex)];
  const cleanText = text.replace(thinkRegex, "").trim();

  if (thinkMatches.length === 0) {
    return <p className="whitespace-pre-wrap">{text}</p>;
  }

  const thinkingContent = thinkMatches.map((m) => m[1].trim()).join("\n\n");

  return (
    <div>
      {thinkingContent && (
        <button
          onClick={() => setShowThinking(!showThinking)}
          className="text-xs text-slate-400 hover:text-slate-300 mb-2 flex items-center gap-1"
        >
          <span
            className={`transition-transform ${showThinking ? "rotate-90" : ""}`}
          >
            ▶
          </span>
          {showThinking ? "Hide thinking" : "Show thinking"}
        </button>
      )}
      {showThinking && (
        <div className="text-xs text-slate-400 bg-slate-800/50 rounded p-2 mb-2 whitespace-pre-wrap border-l-2 border-slate-600">
          {thinkingContent}
        </div>
      )}
      {cleanText && <p className="whitespace-pre-wrap">{cleanText}</p>}
    </div>
  );
}

// Collapsible tool call component
function ToolCall({
  type,
  toolName,
  args,
  result,
}: {
  type: string;
  toolName?: string;
  args?: unknown;
  result?: unknown;
}) {
  const [expanded, setExpanded] = useState(false);

  const isResult = type === "tool-result";

  return (
    <button
      onClick={() => setExpanded(!expanded)}
      className={`w-full text-left text-xs rounded p-2 mt-2 ${
        isResult
          ? "bg-green-900/30 border border-green-800 hover:bg-green-900/50"
          : "bg-slate-800/50 border border-slate-700 hover:bg-slate-700/50"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className={`transition-transform ${expanded ? "rotate-90" : ""}`}>
          ▶
        </span>
        <span className={isResult ? "text-green-400" : "text-slate-400"}>
          {isResult ? "✓" : "⚡"}
        </span>
        <span className="text-slate-300">
          {isResult
            ? `Result from ${toolName || "tool"}`
            : `Called ${toolName || "tool"}`}
        </span>
      </div>
      {expanded && (
        <pre className="mt-2 text-slate-400 overflow-auto whitespace-pre-wrap">
          {JSON.stringify(isResult ? result : args, null, 2)}
        </pre>
      )}
    </button>
  );
}

// Status indicator for model
function ModelStatusBadge({ state }: { state: ModelState }) {
  switch (state.status) {
    case "ready":
      return <span className="text-green-400 text-xs">✓</span>;
    case "downloading":
      return <span className="text-blue-400 text-xs">{state.progress}%</span>;
    case "checking":
      return <span className="text-slate-500 text-xs">...</span>;
    case "not-downloaded":
      return <span className="text-slate-500 text-xs">○</span>;
    default:
      return null;
  }
}

// Model selector component with status
function ModelSelector({
  selectedModel,
  modelStates,
  onSelect,
  disabled,
}: {
  selectedModel: ModelConfig;
  modelStates: Record<string, ModelState>;
  onSelect: (model: ModelConfig) => void;
  disabled: boolean;
}) {
  const currentState = modelStates[selectedModel.id];
  const isLoading = currentState?.status === "downloading";

  return (
    <div className="mb-4">
      <div className="flex items-center gap-3">
        <label className="text-sm text-slate-400">Model:</label>
        <div className="flex-1 flex items-center gap-2">
          <select
            value={selectedModel.id}
            onChange={(e) => {
              const model = MODELS.find((m) => m.id === e.target.value);
              if (model) onSelect(model);
            }}
            disabled={disabled || isLoading}
            className="bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50"
          >
            {MODELS.map((model) => {
              const state = modelStates[model.id];
              const statusText =
                state?.status === "ready"
                  ? " ✓"
                  : state?.status === "downloading"
                    ? ` (${state.progress}%)`
                    : "";
              return (
                <option key={model.id} value={model.id}>
                  {model.name}
                  {statusText}
                </option>
              );
            })}
          </select>

          <ModelStatusBadge state={currentState} />
        </div>

        {disabled && (
          <span className="text-xs text-slate-500">
            (clear chat to change)
          </span>
        )}
      </div>

      {/* Download progress bar */}
      {isLoading && (
        <div className="mt-2">
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>Downloading {selectedModel.name}...</span>
            <span>{currentState.progress}%</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${currentState.progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function ChatPage() {
  const [input, setInput] = useState("");
  const { selectedModel, selectModel, modelStates } = useModelLoader();

  const currentModelState = modelStates[selectedModel.id];
  const isModelReady = currentModelState?.status === "ready";

  // Create transport with selected model - memoized to avoid recreating on every render
  const transport = useMemo(
    () => new TransformersChatTransport(selectedModel),
    [selectedModel]
  );

  const { messages, sendMessage, status, stop, setMessages } =
    useChat<TransformersUIMessage>({
      transport,
      experimental_throttle: 75,
    });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && status === "ready") {
      sendMessage({ text: input });
      setInput("");
    }
  };

  const handleModelChange = (model: ModelConfig) => {
    selectModel(model);
    setMessages([]); // Clear chat when switching models
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
          Offline AI Chat
        </h1>
        <p className="text-center text-slate-400 mb-6">
          Running entirely in your browser with WebGPU
        </p>

        <ModelSelector
          selectedModel={selectedModel}
          modelStates={modelStates}
          onSelect={handleModelChange}
          disabled={hasMessages}
        />

        <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
          <div className="h-[500px] overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-slate-500 mt-20">
                {isModelReady ? (
                  <>
                    <p>Send a message to start chatting</p>
                    <p className="text-xs mt-2">Using: {selectedModel.name}</p>
                  </>
                ) : currentModelState?.status === "downloading" ? (
                  <>
                    <p>Loading {selectedModel.name}...</p>
                    <p className="text-xs mt-2">
                      {currentModelState.progress}% downloaded
                    </p>
                  </>
                ) : (
                  <p>Preparing model...</p>
                )}
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-xl px-4 py-3 ${
                    message.role === "user"
                      ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
                      : "bg-slate-700/50 text-slate-100"
                  }`}
                >
                  {message.parts.map((part, i) => {
                    const p = part as any;

                    switch (part.type) {
                      case "text":
                        return <TextWithThinking key={i} text={p.text} />;

                      case "data-modelDownloadProgress":
                        // Hide these since we show progress in the header now
                        return null;

                      case "tool-invocation":
                        return (
                          <ToolCall
                            key={i}
                            type="tool-invocation"
                            toolName={p.toolInvocation?.toolName}
                            args={p.toolInvocation?.args}
                          />
                        );

                      case "tool-result":
                        return (
                          <ToolCall
                            key={i}
                            type="tool-result"
                            toolName={p.toolName}
                            result={p.result}
                          />
                        );

                      default:
                        // Handle any other tool-* parts as collapsible
                        if (part.type.startsWith("tool-")) {
                          return (
                            <ToolCall
                              key={i}
                              type={part.type}
                              toolName={p.toolName || p.toolInvocation?.toolName}
                              args={p.args || p.toolInvocation?.args}
                              result={p.result || p.output}
                            />
                          );
                        }
                        return null;
                    }
                  })}
                </div>
              </div>
            ))}
          </div>

          {status === "submitted" && (
            <div className="px-4 py-2 text-slate-400 text-sm">Thinking...</div>
          )}

          <form
            onSubmit={handleSubmit}
            className="p-4 border-t border-slate-700 flex gap-3"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                isModelReady ? "Ask something..." : "Waiting for model..."
              }
              disabled={!isModelReady}
              className="flex-1 bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 disabled:opacity-50"
            />
            <button
              type={status === "streaming" ? "button" : "submit"}
              onClick={status === "streaming" ? stop : undefined}
              disabled={!isModelReady && status !== "streaming"}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {status === "streaming" ? "Stop" : "Send"}
            </button>
          </form>
        </div>

        <div className="flex justify-between items-center mt-4 text-slate-500 text-sm">
          <p>Models are cached locally after first download</p>
          {hasMessages && (
            <button
              onClick={() => setMessages([])}
              className="text-slate-400 hover:text-white transition-colors"
            >
              Clear chat
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

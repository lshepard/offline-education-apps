"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { TransformersUIMessage } from "@browser-ai/transformers-js";
import { TransformersChatTransport } from "./chat-transport";
import { MODELS, ModelConfig } from "./models";
import { useModelLoader, ModelState } from "./use-model-loader";

// Component to render text with collapsible <think> blocks
function TextWithThinking({ text }: { text: string }) {
  const [showThinking, setShowThinking] = useState(false);

  const thinkRegex = /<think>([\s\S]*?)<\/think>/g;
  const thinkMatches = [...text.matchAll(thinkRegex)];
  const cleanText = text.replace(thinkRegex, "").trim();

  if (thinkMatches.length === 0) {
    return <p className="whitespace-pre-wrap leading-relaxed">{text}</p>;
  }

  const thinkingContent = thinkMatches.map((m) => m[1].trim()).join("\n\n");

  return (
    <div>
      {thinkingContent && (
        <button
          onClick={() => setShowThinking(!showThinking)}
          className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-2 flex items-center gap-1.5 font-medium"
        >
          <svg
            className={`w-3 h-3 transition-transform ${showThinking ? "rotate-90" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          {showThinking ? "Hide reasoning" : "Show reasoning"}
        </button>
      )}
      {showThinking && (
        <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 mb-3 border-l-2 border-gray-300 dark:border-gray-600">
          <p className="whitespace-pre-wrap">{thinkingContent}</p>
        </div>
      )}
      {cleanText && <p className="whitespace-pre-wrap leading-relaxed">{cleanText}</p>}
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
      className={`w-full text-left text-sm rounded-lg p-3 mt-2 transition-colors ${
        isResult
          ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30"
          : "bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
      }`}
    >
      <div className="flex items-center gap-2">
        <svg
          className={`w-3 h-3 transition-transform text-gray-400 ${expanded ? "rotate-90" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className={isResult ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-gray-400"}>
          {isResult ? "Result:" : "Tool:"}
        </span>
        <span className="font-medium text-gray-700 dark:text-gray-300">
          {toolName || "unknown"}
        </span>
      </div>
      {expanded && (
        <pre className="mt-2 text-xs text-gray-600 dark:text-gray-400 overflow-auto whitespace-pre-wrap font-mono bg-white dark:bg-gray-900 rounded p-2">
          {JSON.stringify(isResult ? result : args, null, 2)}
        </pre>
      )}
    </button>
  );
}

// Status indicator for model
function ModelStatusIndicator({ state }: { state: ModelState }) {
  switch (state.status) {
    case "ready":
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
          Ready
        </span>
      );
    case "downloading":
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400">
          <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {state.progress}%
        </span>
      );
    case "checking":
      return <span className="text-xs text-gray-400">Checking...</span>;
    default:
      return <span className="text-xs text-gray-400">Not loaded</span>;
  }
}

// Model selector component
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
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            AI Model
          </label>
          <select
            value={selectedModel.id}
            onChange={(e) => {
              const model = MODELS.find((m) => m.id === e.target.value);
              if (model) onSelect(model);
            }}
            disabled={disabled || isLoading}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {MODELS.map((model) => {
              const state = modelStates[model.id];
              const isReady = state?.status === "ready";
              return (
                <option key={model.id} value={model.id}>
                  {model.name}{isReady ? " ✓" : ""}
                </option>
              );
            })}
          </select>
        </div>

        <ModelStatusIndicator state={currentState} />
      </div>

      {isLoading && (
        <div className="mt-3">
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span>Downloading model...</span>
            <span>{currentState.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
            <div
              className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${currentState.progress}%` }}
            />
          </div>
        </div>
      )}

      {disabled && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Clear the conversation to switch models
        </p>
      )}
    </div>
  );
}

// Info banner for educational context
function InfoBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
      <div className="flex gap-3">
        <div className="flex-shrink-0">
          <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
            Privacy-First AI Assistant
          </h3>
          <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
            This AI runs entirely in your browser. Your conversations never leave your device and no internet connection is required after the model downloads.
          </p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="flex-shrink-0 text-blue-500 hover:text-blue-700 dark:hover:text-blue-300"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// System prompt configuration panel
function SystemPromptPanel({
  systemPrompt,
  onSystemPromptChange,
  disabled,
}: {
  systemPrompt: string;
  onSystemPromptChange: (prompt: string) => void;
  disabled: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasCustomPrompt = systemPrompt.trim().length > 0;

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg mb-4 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? "rotate-90" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            System Prompt
          </span>
          {hasCustomPrompt && (
            <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">
              Configured
            </span>
          )}
        </div>
        <span className="text-xs text-gray-400">
          {isExpanded ? "Click to collapse" : "Click to expand"}
        </span>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 mb-2">
            Customize how the AI behaves by providing instructions. This is prepended to every conversation.
          </p>
          <textarea
            value={systemPrompt}
            onChange={(e) => onSystemPromptChange(e.target.value)}
            disabled={disabled}
            placeholder="Example: You are a helpful tutor specializing in mathematics. Explain concepts clearly and provide step-by-step solutions."
            rows={4}
            className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-none"
          />
          {disabled && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
              Clear the conversation to modify the system prompt.
            </p>
          )}
          {!disabled && hasCustomPrompt && (
            <button
              onClick={() => onSystemPromptChange("")}
              className="text-xs text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 mt-2"
            >
              Clear system prompt
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function ChatPage() {
  const [input, setInput] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const { selectedModel, selectModel, modelStates } = useModelLoader();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentModelState = modelStates[selectedModel.id];
  const isModelReady = currentModelState?.status === "ready";

  const transport = useMemo(
    () => new TransformersChatTransport(selectedModel, systemPrompt),
    [selectedModel, systemPrompt]
  );

  const { messages, sendMessage, status, stop, setMessages } =
    useChat<TransformersUIMessage>({
      transport,
      experimental_throttle: 75,
    });

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && status === "ready" && isModelReady) {
      sendMessage({ text: input });
      setInput("");
    }
  };

  const handleModelChange = (model: ModelConfig) => {
    selectModel(model);
    setMessages([]);
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Offline AI Assistant
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Powered by WebGPU
              </p>
            </div>
            {hasMessages && (
              <button
                onClick={() => setMessages([])}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Clear
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        <InfoBanner />

        <ModelSelector
          selectedModel={selectedModel}
          modelStates={modelStates}
          onSelect={handleModelChange}
          disabled={hasMessages}
        />

        <SystemPromptPanel
          systemPrompt={systemPrompt}
          onSystemPromptChange={setSystemPrompt}
          disabled={hasMessages}
        />

        {/* Chat container */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          {/* Messages area */}
          <div className="h-[500px] overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center px-4">
                {isModelReady ? (
                  <>
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
                      <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                    </div>
                    <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
                      Start a conversation
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
                      Ask questions, get explanations, or explore topics. The AI is ready to help.
                    </p>
                  </>
                ) : currentModelState?.status === "downloading" ? (
                  <>
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
                      <svg className="w-6 h-6 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                    <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
                      Loading {selectedModel.name}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {currentModelState.progress}% downloaded
                    </p>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                      <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Preparing model...
                    </p>
                  </>
                )}
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-4 py-3 ${
                    message.role === "user"
                      ? "bg-blue-500 text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  }`}
                >
                  {message.parts.map((part, i) => {
                    const p = part as any;

                    switch (part.type) {
                      case "text":
                        return <TextWithThinking key={i} text={p.text} />;

                      case "data-modelDownloadProgress":
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

            {status === "submitted" && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-gray-700 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-sm">Thinking...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <form
            onSubmit={handleSubmit}
            className="border-t border-gray-200 dark:border-gray-700 p-4"
          >
            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isModelReady ? "Type your message..." : "Waiting for model to load..."}
                disabled={!isModelReady}
                className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              />
              {status === "streaming" ? (
                <button
                  type="button"
                  onClick={stop}
                  className="px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors"
                >
                  Stop
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!isModelReady || !input.trim()}
                  className="px-4 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
                >
                  Send
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Footer */}
        <footer className="mt-4 text-center text-xs text-gray-400 dark:text-gray-500">
          Models are downloaded once and cached locally for offline use
        </footer>
      </main>
    </div>
  );
}

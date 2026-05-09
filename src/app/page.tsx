"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { TransformersUIMessage } from "@browser-ai/transformers-js";
import { TransformersChatTransport } from "./chat-transport";
import { MODELS, ModelConfig } from "./models";
import { useModelLoader, ModelState } from "./use-model-loader";
import { EDUCATIONAL_PRESETS, EducationalPreset } from "./presets";
import ReactMarkdown from "react-markdown";

// Icon components for presets
function PresetIcon({ icon, className }: { icon: string; className?: string }) {
  const icons: Record<string, React.ReactNode> = {
    "clipboard-list": (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
    "academic-cap": (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
      </svg>
    ),
    "star": (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
    "book-open": (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
    "question-mark-circle": (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    "table-cells": (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
    "users": (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    "envelope": (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  };

  return icons[icon] || icons["clipboard-list"];
}

// Color classes for preset cards
const colorClasses: Record<string, { bg: string; icon: string; border: string }> = {
  blue: { bg: "bg-blue-50 dark:bg-blue-900/20", icon: "text-blue-500", border: "border-blue-200 dark:border-blue-800" },
  purple: { bg: "bg-purple-50 dark:bg-purple-900/20", icon: "text-purple-500", border: "border-purple-200 dark:border-purple-800" },
  yellow: { bg: "bg-yellow-50 dark:bg-yellow-900/20", icon: "text-yellow-500", border: "border-yellow-200 dark:border-yellow-800" },
  green: { bg: "bg-green-50 dark:bg-green-900/20", icon: "text-green-500", border: "border-green-200 dark:border-green-800" },
  red: { bg: "bg-red-50 dark:bg-red-900/20", icon: "text-red-500", border: "border-red-200 dark:border-red-800" },
  indigo: { bg: "bg-indigo-50 dark:bg-indigo-900/20", icon: "text-indigo-500", border: "border-indigo-200 dark:border-indigo-800" },
  teal: { bg: "bg-teal-50 dark:bg-teal-900/20", icon: "text-teal-500", border: "border-teal-200 dark:border-teal-800" },
  orange: { bg: "bg-orange-50 dark:bg-orange-900/20", icon: "text-orange-500", border: "border-orange-200 dark:border-orange-800" },
};

// Home page component
function HomePage({
  onStartChat,
  onSelectPreset,
  modelStates,
}: {
  onStartChat: () => void;
  onSelectPreset: (preset: EducationalPreset) => void;
  modelStates: Record<string, ModelState>;
}) {
  const defaultModelState = modelStates[MODELS[0].id];
  const isModelReady = defaultModelState?.status === "ready";
  const isDownloading = defaultModelState?.status === "downloading";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Offline AI Teaching Tools
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Privacy-first AI assistants that run entirely in your browser
          </p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Model status banner */}
        {isDownloading && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <div>
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Downloading AI Model...
                </p>
                <p className="text-sm text-blue-600 dark:text-blue-300">
                  {defaultModelState.progress}% complete. This only happens once.
                </p>
              </div>
            </div>
            <div className="mt-3 w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${defaultModelState.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Start New Chat button */}
        <div className="mb-8">
          <button
            onClick={onStartChat}
            disabled={!isModelReady}
            className="w-full sm:w-auto px-8 py-4 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white text-lg font-semibold rounded-xl transition-colors disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Start New Chat
            {!isModelReady && !isDownloading && (
              <span className="text-sm font-normal opacity-75">(Loading model...)</span>
            )}
          </button>
        </div>

        {/* Educational Tools Section */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Educational Tools
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Select a tool to start with a pre-configured AI assistant optimized for that task.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {EDUCATIONAL_PRESETS.map((preset) => {
              const colors = colorClasses[preset.color] || colorClasses.blue;
              return (
                <button
                  key={preset.id}
                  onClick={() => onSelectPreset(preset)}
                  disabled={!isModelReady}
                  className={`text-left p-4 rounded-xl border ${colors.border} ${colors.bg} hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${colors.bg}`}>
                      <PresetIcon icon={preset.icon} className={`w-5 h-5 ${colors.icon}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 dark:text-gray-100">
                        {preset.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                        {preset.description}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Privacy notice */}
        <div className="mt-8 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <div className="flex gap-3">
            <svg className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Your data stays on your device
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                All AI processing happens locally in your browser. No data is sent to external servers.
                After the initial model download, everything works offline.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Markdown content renderer
function MarkdownContent({ content, className }: { content: string; className?: string }) {
  return (
    <div className={`prose prose-sm dark:prose-invert max-w-none ${className || ""}`}>
      <ReactMarkdown
        components={{
          // Style code blocks
          pre: ({ children }) => (
            <pre className="bg-gray-800 dark:bg-gray-900 text-gray-100 rounded-lg p-3 overflow-x-auto text-sm">
              {children}
            </pre>
          ),
          code: ({ children, className }) => {
            const isInline = !className;
            return isInline ? (
              <code className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-1.5 py-0.5 rounded text-sm">
                {children}
              </code>
            ) : (
              <code>{children}</code>
            );
          },
          // Style links
          a: ({ href, children }) => (
            <a href={href} className="text-blue-500 hover:text-blue-600 underline" target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
          // Style lists
          ul: ({ children }) => <ul className="list-disc pl-4 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-4 space-y-1">{children}</ol>,
          // Style headings
          h1: ({ children }) => <h1 className="text-xl font-bold mt-4 mb-2">{children}</h1>,
          h2: ({ children }) => <h2 className="text-lg font-bold mt-3 mb-2">{children}</h2>,
          h3: ({ children }) => <h3 className="text-base font-semibold mt-2 mb-1">{children}</h3>,
          // Style paragraphs
          p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
          // Style blockquotes
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-3 italic text-gray-600 dark:text-gray-400">
              {children}
            </blockquote>
          ),
          // Style tables
          table: ({ children }) => (
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-300 dark:border-gray-600">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-gray-300 dark:border-gray-600 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 font-semibold text-left">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-gray-300 dark:border-gray-600 px-3 py-1.5">{children}</td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

// Component to render text with collapsible <think> blocks
function TextWithThinking({ text }: { text: string }) {
  const [showThinking, setShowThinking] = useState(false);

  const thinkRegex = /<think>([\s\S]*?)<\/think>/g;
  const thinkMatches = [...text.matchAll(thinkRegex)];
  const cleanText = text.replace(thinkRegex, "").trim();

  if (thinkMatches.length === 0) {
    return <MarkdownContent content={text} />;
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
      {cleanText && <MarkdownContent content={cleanText} />}
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

// System prompt configuration panel
function SystemPromptPanel({
  systemPrompt,
  onSystemPromptChange,
  disabled,
  presetName,
}: {
  systemPrompt: string;
  onSystemPromptChange: (prompt: string) => void;
  disabled: boolean;
  presetName?: string;
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
          {presetName && (
            <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">
              {presetName}
            </span>
          )}
          {!presetName && hasCustomPrompt && (
            <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full">
              Custom
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
            Customize how the AI behaves by providing instructions.
          </p>
          <textarea
            value={systemPrompt}
            onChange={(e) => onSystemPromptChange(e.target.value)}
            disabled={disabled}
            placeholder="Example: You are a helpful tutor specializing in mathematics..."
            rows={6}
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

// Chat interface component
function ChatInterface({
  systemPrompt,
  presetName,
  onBack,
  onSystemPromptChange,
  selectedModel,
  modelStates,
  onModelChange,
}: {
  systemPrompt: string;
  presetName?: string;
  onBack: () => void;
  onSystemPromptChange: (prompt: string) => void;
  selectedModel: ModelConfig;
  modelStates: Record<string, ModelState>;
  onModelChange: (model: ModelConfig) => void;
}) {
  const [input, setInput] = useState("");
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

  const hasMessages = messages.length > 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={onBack}
                className="p-2 -ml-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  {presetName || "AI Chat"}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Powered by {selectedModel.name}
                </p>
              </div>
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
        <ModelSelector
          selectedModel={selectedModel}
          modelStates={modelStates}
          onSelect={onModelChange}
          disabled={hasMessages}
        />

        <SystemPromptPanel
          systemPrompt={systemPrompt}
          onSystemPromptChange={onSystemPromptChange}
          disabled={hasMessages}
          presetName={presetName}
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
                      {presetName ? `${presetName} Ready` : "Start a conversation"}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
                      {presetName
                        ? "Type your request below to get started."
                        : "Ask questions, get explanations, or explore topics."}
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

            {/* Loading indicator when waiting for response */}
            {(status === "submitted" || (status === "streaming" && messages.length > 0 && !messages[messages.length - 1].parts.some(p => p.type === "text" && (p as any).text?.trim()))) && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-gray-700 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-3">
                    {/* Animated thinking dots */}
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                      <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                      <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                    </div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {status === "submitted" ? "Processing..." : "Thinking..."}
                    </span>
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
      </main>
    </div>
  );
}

// Main page component with navigation
export default function Page() {
  const [view, setView] = useState<"home" | "chat">("home");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [presetName, setPresetName] = useState<string | undefined>();
  const { selectedModel, selectModel, modelStates } = useModelLoader();

  const handleStartChat = () => {
    setSystemPrompt("");
    setPresetName(undefined);
    setView("chat");
  };

  const handleSelectPreset = (preset: EducationalPreset) => {
    setSystemPrompt(preset.systemPrompt);
    setPresetName(preset.name);
    setView("chat");
  };

  const handleBack = () => {
    setView("home");
    setSystemPrompt("");
    setPresetName(undefined);
  };

  const handleModelChange = (model: ModelConfig) => {
    selectModel(model);
  };

  if (view === "chat") {
    return (
      <ChatInterface
        systemPrompt={systemPrompt}
        presetName={presetName}
        onBack={handleBack}
        onSystemPromptChange={setSystemPrompt}
        selectedModel={selectedModel}
        modelStates={modelStates}
        onModelChange={handleModelChange}
      />
    );
  }

  return (
    <HomePage
      onStartChat={handleStartChat}
      onSelectPreset={handleSelectPreset}
      modelStates={modelStates}
    />
  );
}

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { MODELS, ModelConfig } from "./models";
import { getOrCreateModelInstance, clearModelInstance } from "./chat-transport";

export type DownloadStatus = "unknown" | "checking" | "not-downloaded" | "downloaded";
export type LoadStatus = "idle" | "loading" | "ready" | "error";

export interface ModelState {
  downloadStatus: DownloadStatus;
  loadStatus: LoadStatus;
  progress: number;
  error?: string;
  contextLength?: number;
}

// Fetch model config to get context length
async function fetchModelContextLength(modelId: string): Promise<number | undefined> {
  try {
    const configUrl = `https://huggingface.co/${modelId}/resolve/main/config.json`;
    const response = await fetch(configUrl);
    if (!response.ok) return undefined;

    const config = await response.json();
    // Different models use different field names
    return config.max_position_embeddings
      || config.max_seq_len
      || config.n_positions
      || config.seq_length
      || config.sliding_window; // Some models use this
  } catch {
    return undefined;
  }
}

// Check if a model's files are in the browser cache
async function checkModelInCache(modelId: string): Promise<boolean> {
  if (typeof window === "undefined" || !("caches" in window)) {
    return false;
  }

  try {
    // Check the transformers-cache specifically (used by @huggingface/transformers)
    const cache = await caches.open("transformers-cache");
    const keys = await cache.keys();

    // Count matching files for this model
    let matchCount = 0;
    for (const request of keys) {
      if (request.url.includes(modelId)) {
        matchCount++;
      }
    }

    console.log(`[Cache] ${modelId}: found ${matchCount} cached files`);
    return matchCount > 0;
  } catch (e) {
    console.error("[Cache] Error checking cache:", e);
    return false;
  }
}

export function useModelLoader() {
  const [modelStates, setModelStates] = useState<Record<string, ModelState>>(() => {
    const initial: Record<string, ModelState> = {};
    for (const model of MODELS) {
      initial[model.id] = {
        downloadStatus: "unknown",
        loadStatus: "idle",
        progress: 0
      };
    }
    return initial;
  });

  // Track which model is currently being loaded for resume on wake
  const loadingModelRef = useRef<ModelConfig | null>(null);

  // Check download status of all models on mount
  useEffect(() => {
    async function checkAllModels() {
      for (const model of MODELS) {
        setModelStates((prev) => ({
          ...prev,
          [model.id]: { ...prev[model.id], downloadStatus: "checking" },
        }));

        const isInCache = await checkModelInCache(model.id);

        setModelStates((prev) => ({
          ...prev,
          [model.id]: {
            ...prev[model.id],
            downloadStatus: isInCache ? "downloaded" : "not-downloaded",
          },
        }));
      }
    }

    checkAllModels();
  }, []);

  // Resume download when page becomes visible again (phone wake)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Check if any model was in error state and retry
        for (const model of MODELS) {
          const state = modelStates[model.id];
          if (state?.loadStatus === "error") {
            console.log(`[Resume] Retrying failed model: ${model.name}`);
            // Clear the error and allow retry
            setModelStates((prev) => ({
              ...prev,
              [model.id]: { ...prev[model.id], loadStatus: "idle", error: undefined },
            }));
          }
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [modelStates]);

  // Load a model (download if needed, then initialize)
  const loadModel = useCallback(async (model: ModelConfig, isRetry = false) => {
    const currentState = modelStates[model.id];
    if (currentState?.loadStatus === "ready" || currentState?.loadStatus === "loading") {
      return;
    }

    // Track loading model for resume on wake
    loadingModelRef.current = model;

    // If retrying, clear the old instance to get a fresh one
    if (isRetry) {
      clearModelInstance(model.id);
    }

    setModelStates((prev) => ({
      ...prev,
      [model.id]: { ...prev[model.id], loadStatus: "loading", progress: 0, error: undefined },
    }));

    try {
      // Use shared model instance
      const instance = getOrCreateModelInstance(model);

      await instance.createSessionWithProgress((progress: number) => {
        const percent = Math.round(progress * 100);
        setModelStates((prev) => ({
          ...prev,
          [model.id]: {
            ...prev[model.id],
            loadStatus: "loading",
            progress: percent,
            // Mark as downloaded once we start getting progress
            downloadStatus: "downloaded",
          },
        }));
      });

      // Fetch context length from model config
      const contextLength = await fetchModelContextLength(model.id);

      loadingModelRef.current = null;
      setModelStates((prev) => ({
        ...prev,
        [model.id]: {
          ...prev[model.id],
          loadStatus: "ready",
          downloadStatus: "downloaded",
          progress: 100,
          contextLength,
        },
      }));
    } catch (error) {
      console.error("Failed to load model:", error);
      loadingModelRef.current = null;
      setModelStates((prev) => ({
        ...prev,
        [model.id]: {
          ...prev[model.id],
          loadStatus: "error",
          progress: 0,
          error: error instanceof Error ? error.message : "Failed to load model"
        },
      }));
    }
  }, [modelStates]);

  // Download a model (for pre-downloading from home page)
  const downloadModel = useCallback(async (model: ModelConfig) => {
    const currentState = modelStates[model.id];
    if (currentState?.downloadStatus === "downloaded" || currentState?.loadStatus === "loading") {
      return;
    }

    setModelStates((prev) => ({
      ...prev,
      [model.id]: { ...prev[model.id], loadStatus: "loading", progress: 0 },
    }));

    try {
      // Use shared model instance
      const instance = getOrCreateModelInstance(model);

      await instance.createSessionWithProgress((progress: number) => {
        const percent = Math.round(progress * 100);
        setModelStates((prev) => ({
          ...prev,
          [model.id]: {
            ...prev[model.id],
            loadStatus: "loading",
            progress: percent,
          },
        }));
      });

      // Fetch context length from model config
      const contextLength = await fetchModelContextLength(model.id);

      setModelStates((prev) => ({
        ...prev,
        [model.id]: {
          ...prev[model.id],
          loadStatus: "ready",
          downloadStatus: "downloaded",
          progress: 100,
          contextLength,
        },
      }));
    } catch (error) {
      console.error("Failed to download model:", error);
      setModelStates((prev) => ({
        ...prev,
        [model.id]: {
          ...prev[model.id],
          loadStatus: "error",
          downloadStatus: "not-downloaded",
          progress: 0,
          error: error instanceof Error ? error.message : "Failed to download model"
        },
      }));
    }
  }, [modelStates]);

  // Clear a model from cache
  const clearModel = useCallback(async (model: ModelConfig) => {
    if (typeof window === "undefined" || !("caches" in window)) {
      return;
    }

    try {
      const cache = await caches.open("transformers-cache");
      const keys = await cache.keys();

      // Delete all cached files for this model
      for (const request of keys) {
        if (request.url.includes(model.id)) {
          await cache.delete(request);
        }
      }

      setModelStates((prev) => ({
        ...prev,
        [model.id]: {
          downloadStatus: "not-downloaded",
          loadStatus: "idle",
          progress: 0,
        },
      }));
    } catch (error) {
      console.error("Failed to clear model:", error);
    }
  }, []);

  return {
    modelStates,
    loadModel,
    downloadModel,
    clearModel,
  };
}

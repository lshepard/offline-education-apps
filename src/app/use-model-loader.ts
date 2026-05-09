"use client";

import { useState, useEffect, useCallback } from "react";
import { transformersJS } from "@browser-ai/transformers-js";
import { MODELS, ModelConfig } from "./models";

export type DownloadStatus = "unknown" | "checking" | "not-downloaded" | "downloaded";
export type LoadStatus = "idle" | "loading" | "ready" | "error";

export interface ModelState {
  downloadStatus: DownloadStatus;
  loadStatus: LoadStatus;
  progress: number;
  error?: string;
}

// Check if a model's files are in the browser cache
async function checkModelInCache(modelId: string): Promise<boolean> {
  if (typeof window === "undefined" || !("caches" in window)) {
    return false;
  }

  try {
    // Get all cache names and search through them
    const cacheNames = await caches.keys();

    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();

      // Check if any cached URL contains this model's ID
      for (const request of keys) {
        if (request.url.includes(modelId)) {
          return true;
        }
      }
    }

    return false;
  } catch {
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

  // Load a model (download if needed, then initialize)
  const loadModel = useCallback(async (model: ModelConfig) => {
    const currentState = modelStates[model.id];
    if (currentState?.loadStatus === "ready" || currentState?.loadStatus === "loading") {
      return;
    }

    setModelStates((prev) => ({
      ...prev,
      [model.id]: { ...prev[model.id], loadStatus: "loading", progress: 0 },
    }));

    try {
      const instance = transformersJS(model.id, {
        device: model.device,
        dtype: model.dtype,
        ...(model.supportsWorker && typeof Worker !== "undefined"
          ? {
              worker: new Worker(new URL("./worker.ts", import.meta.url), {
                type: "module",
              }),
            }
          : {}),
      });

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

      setModelStates((prev) => ({
        ...prev,
        [model.id]: {
          ...prev[model.id],
          loadStatus: "ready",
          downloadStatus: "downloaded",
          progress: 100
        },
      }));
    } catch (error) {
      console.error("Failed to load model:", error);
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
      const instance = transformersJS(model.id, {
        device: model.device,
        dtype: model.dtype,
        ...(model.supportsWorker && typeof Worker !== "undefined"
          ? {
              worker: new Worker(new URL("./worker.ts", import.meta.url), {
                type: "module",
              }),
            }
          : {}),
      });

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

      setModelStates((prev) => ({
        ...prev,
        [model.id]: {
          ...prev[model.id],
          loadStatus: "ready",
          downloadStatus: "downloaded",
          progress: 100
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
      const cache = await caches.open("default");
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

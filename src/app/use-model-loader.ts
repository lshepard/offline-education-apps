"use client";

import { useState, useEffect, useCallback } from "react";
import { transformersJS } from "@browser-ai/transformers-js";
import { MODELS, ModelConfig } from "./models";

export type ModelStatus = "unknown" | "checking" | "not-downloaded" | "downloading" | "ready";

export interface ModelState {
  status: ModelStatus;
  progress: number;
}

export function useModelLoader() {
  const [modelStates, setModelStates] = useState<Record<string, ModelState>>(() => {
    const initial: Record<string, ModelState> = {};
    for (const model of MODELS) {
      initial[model.id] = { status: "unknown", progress: 0 };
    }
    return initial;
  });

  // Check availability of all models on mount
  useEffect(() => {
    async function checkAllModels() {
      for (const model of MODELS) {
        setModelStates((prev) => ({
          ...prev,
          [model.id]: { ...prev[model.id], status: "checking" },
        }));

        try {
          const instance = transformersJS(model.id, {
            device: model.device,
            dtype: model.dtype,
          });
          const availability = await instance.availability();

          setModelStates((prev) => ({
            ...prev,
            [model.id]: {
              status: availability === "available" ? "ready" : "not-downloaded",
              progress: availability === "available" ? 100 : 0,
            },
          }));
        } catch {
          setModelStates((prev) => ({
            ...prev,
            [model.id]: { status: "not-downloaded", progress: 0 },
          }));
        }
      }
    }

    checkAllModels();
  }, []);

  // Load/download a specific model
  const loadModel = useCallback(async (model: ModelConfig) => {
    const currentState = modelStates[model.id];
    if (currentState?.status === "ready" || currentState?.status === "downloading") {
      return;
    }

    setModelStates((prev) => ({
      ...prev,
      [model.id]: { status: "downloading", progress: 0 },
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
          [model.id]: { status: "downloading", progress: percent },
        }));
      });

      setModelStates((prev) => ({
        ...prev,
        [model.id]: { status: "ready", progress: 100 },
      }));
    } catch (error) {
      console.error("Failed to load model:", error);
      setModelStates((prev) => ({
        ...prev,
        [model.id]: { status: "not-downloaded", progress: 0 },
      }));
    }
  }, [modelStates]);

  return {
    modelStates,
    loadModel,
  };
}

import { WorkerLoadOptions } from "@browser-ai/transformers-js";

export interface ModelConfig extends Omit<WorkerLoadOptions, "worker"> {
  id: string;
  name: string;
  supportsWorker?: boolean;
}

export const MODELS: ModelConfig[] = [
  {
    // Gemma 4 - multimodal, larger and more capable (default)
    id: "onnx-community/gemma-4-E2B-it-ONNX",
    name: "Gemma 4 E2B",
    device: "webgpu",
    dtype: "q4f16",
    supportsWorker: true,
  },
  {
    // Gemma 4 E4B - larger variant
    id: "onnx-community/gemma-4-E4B-it-ONNX",
    name: "Gemma 4 E4B",
    device: "webgpu",
    dtype: "q4f16",
    supportsWorker: true,
  },
  {
    // Qwen3 is better at tool calling / reasoning
    id: "onnx-community/Qwen3-0.6B-ONNX",
    name: "Qwen3 0.6B",
    device: "webgpu",
    dtype: "q4f16",
    supportsWorker: true,
  },
  {
    id: "onnx-community/gemma-3-1b-it-ONNX",
    name: "Gemma 3 1B",
    device: "webgpu",
    dtype: "q4f16",
    supportsWorker: true,
  },
];

export const DEFAULT_MODEL = MODELS[0];

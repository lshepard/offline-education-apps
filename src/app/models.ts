import { WorkerLoadOptions } from "@browser-ai/transformers-js";

export interface ModelConfig extends Omit<WorkerLoadOptions, "worker"> {
  id: string;
  name: string;
  company: string;
  releaseDate: string;
  parameters: string;
  memoryRequired: string;
  supportsWorker?: boolean;
}

export const MODELS: ModelConfig[] = [
  // Google Gemma models
  {
    id: "onnx-community/gemma-4-E2B-it-ONNX",
    name: "Gemma 4 E2B",
    company: "Google",
    releaseDate: "2026-04",
    parameters: "2.3B",
    memoryRequired: "~1.5 GB",
    device: "webgpu",
    dtype: "q4f16",
    supportsWorker: true,
  },
  {
    id: "onnx-community/gemma-4-E4B-it-ONNX",
    name: "Gemma 4 E4B",
    company: "Google",
    releaseDate: "2026-04",
    parameters: "4.5B",
    memoryRequired: "~3 GB",
    device: "webgpu",
    dtype: "q4f16",
    supportsWorker: true,
  },
  {
    id: "onnx-community/gemma-3-1b-it-ONNX",
    name: "Gemma 3 1B",
    company: "Google",
    releaseDate: "2025-03",
    parameters: "1B",
    memoryRequired: "~0.8 GB",
    device: "webgpu",
    dtype: "q4f16",
    supportsWorker: true,
  },
  // Alibaba Qwen models
  {
    id: "onnx-community/Qwen3.5-4B-ONNX",
    name: "Qwen3.5 4B",
    company: "Alibaba",
    releaseDate: "2026-02",
    parameters: "4B",
    memoryRequired: "~2.5 GB",
    device: "webgpu",
    dtype: "q4f16",
    supportsWorker: true,
  },
  {
    id: "onnx-community/Qwen3.5-2B-ONNX",
    name: "Qwen3.5 2B",
    company: "Alibaba",
    releaseDate: "2026-02",
    parameters: "2B",
    memoryRequired: "~1.5 GB",
    device: "webgpu",
    dtype: "q4f16",
    supportsWorker: true,
  },
  // DeepSeek models
  {
    id: "onnx-community/DeepSeek-R1-Distill-Qwen-1.5B-ONNX",
    name: "DeepSeek R1 Distill 1.5B",
    company: "DeepSeek",
    releaseDate: "2025-01",
    parameters: "1.5B",
    memoryRequired: "~1.2 GB",
    device: "webgpu",
    dtype: "q4f16",
    supportsWorker: true,
  },
  // IBM Granite models
  {
    id: "onnx-community/granite-4.0-1b-ONNX-web",
    name: "Granite 4.0 1B",
    company: "IBM",
    releaseDate: "2025-10",
    parameters: "1.6B",
    memoryRequired: "~1 GB",
    device: "webgpu",
    dtype: "q4f16",
    supportsWorker: true,
  },
  // Mistral models
  {
    id: "mistralai/Ministral-3-3B-Instruct-2512-ONNX",
    name: "Ministral 3B",
    company: "Mistral AI",
    releaseDate: "2025-12",
    parameters: "3.4B",
    memoryRequired: "~2.5 GB",
    device: "webgpu",
    dtype: "q4f16",
    supportsWorker: true,
  },
  // HuggingFace SmolLM models
  {
    id: "HuggingFaceTB/SmolLM2-1.7B-Instruct",
    name: "SmolLM2 1.7B",
    company: "Hugging Face",
    releaseDate: "2025-02",
    parameters: "1.7B",
    memoryRequired: "~1.3 GB",
    device: "webgpu",
    dtype: "q4f16",
    supportsWorker: true,
  },
];

export const DEFAULT_MODEL = MODELS[0];

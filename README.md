# Offline Education Apps

An offline AI chatbot that runs entirely in your browser using WebGPU.

## Features

- Runs LLMs locally in the browser (no server required)
- WebGPU acceleration for fast inference
- Multiple model support (Gemma 4, Qwen3, Gemma 3)
- Auto-downloads and caches models
- Collapsible thinking/reasoning blocks
- Tool calling support

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:3000 in Chrome 113+ or Edge 113+.

## Requirements

- Node.js 18+
- Browser with WebGPU support (Chrome 113+, Edge 113+)
- GPU with ~2GB+ VRAM

## Tech Stack

- Next.js
- Vercel AI SDK
- Transformers.js
- Tailwind CSS


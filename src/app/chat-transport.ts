import {
  ChatTransport,
  UIMessageChunk,
  streamText,
  convertToModelMessages,
  ChatRequestOptions,
  createUIMessageStream,
  stepCountIs,
} from "ai";
import {
  TransformersJSLanguageModel,
  TransformersUIMessage,
  transformersJS,
} from "@browser-ai/transformers-js";
import { MODELS, ModelConfig } from "./models";
import { createTools } from "./tools";

export class TransformersChatTransport
  implements ChatTransport<TransformersUIMessage>
{
  private model: TransformersJSLanguageModel | null = null;
  private currentModelId: string | null = null;
  private tools: ReturnType<typeof createTools>;
  private modelConfig: ModelConfig;

  constructor(modelConfig?: ModelConfig) {
    this.tools = createTools();
    this.modelConfig = modelConfig || MODELS[0];
  }

  private getModel(): TransformersJSLanguageModel {
    // Create new model if config changed or not initialized
    if (!this.model || this.currentModelId !== this.modelConfig.id) {
      this.currentModelId = this.modelConfig.id;
      this.model = transformersJS(this.modelConfig.id, {
        device: this.modelConfig.device,
        dtype: this.modelConfig.dtype,
        ...(this.modelConfig.supportsWorker && typeof Worker !== "undefined"
          ? {
              worker: new Worker(new URL("./worker.ts", import.meta.url), {
                type: "module",
              }),
            }
          : {}),
      });
    }
    return this.model;
  }

  async sendMessages(
    options: {
      chatId: string;
      messages: TransformersUIMessage[];
      abortSignal: AbortSignal | undefined;
    } & {
      trigger: "submit-message" | "submit-tool-result" | "regenerate-message";
      messageId: string | undefined;
    } & ChatRequestOptions
  ): Promise<ReadableStream<UIMessageChunk>> {
    const { messages, abortSignal } = options;

    // Filter messages to only include those with actual text content
    // and ensure proper user/assistant alternation
    const filteredMessages = messages.filter((msg) => {
      const hasText = msg.parts.some(
        (part) => part.type === "text" && part.text.trim().length > 0
      );
      return hasText;
    });

    const prompt = await convertToModelMessages(filteredMessages);

    return createUIMessageStream({
      execute: async ({ writer }) => {
        const model = this.getModel();
        let downloadProgressId: string | undefined;
        const availability = await model.availability();

        if (availability !== "available") {
          await model.createSessionWithProgress((progress: number) => {
            const percent = Math.round(progress * 100);

            if (progress >= 1) {
              if (downloadProgressId) {
                writer.write({
                  type: "data-modelDownloadProgress",
                  id: downloadProgressId,
                  data: {
                    status: "complete",
                    progress: 100,
                    message: "Model ready!",
                  },
                });
              }
              return;
            }

            if (!downloadProgressId) {
              downloadProgressId = `download-${Date.now()}`;
            }

            writer.write({
              type: "data-modelDownloadProgress",
              id: downloadProgressId,
              data: {
                status: "downloading",
                progress: percent,
                message: `Downloading model... ${percent}%`,
              },
            });
          });
        }

        const result = streamText({
          model: model,
          tools: this.tools,
          stopWhen: stepCountIs(5),
          messages: prompt,
          abortSignal,
        });

        writer.merge(result.toUIMessageStream({ sendStart: false }));
      },
    });
  }

  async reconnectToStream(): Promise<ReadableStream<UIMessageChunk> | null> {
    return null;
  }
}

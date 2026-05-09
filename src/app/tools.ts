import { tool } from "ai";
import z from "zod";

export const createTools = () => ({
  getCurrentTime: tool({
    description: "Get the current date and time.",
    inputSchema: z.object({}),
    execute: async () => {
      const now = new Date();
      return {
        timestamp: now.toISOString(),
        date: now.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        time: now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        }),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
    },
  }),
  randomNumber: tool({
    description: "Generate a random integer between min and max (inclusive).",
    inputSchema: z.object({
      min: z.number().describe("The minimum value (inclusive)"),
      max: z.number().describe("The maximum value (inclusive)"),
    }),
    execute: async ({ min, max }) => {
      return (
        Math.floor(Math.random() * (Math.floor(max) - Math.ceil(min) + 1)) +
        Math.ceil(min)
      );
    },
  }),
});

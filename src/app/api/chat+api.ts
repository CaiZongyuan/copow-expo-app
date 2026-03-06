import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import {
  addToolInputExamplesMiddleware,
  convertToModelMessages,
  stepCountIs,
  streamText,
  UIMessage,
  wrapLanguageModel,
} from "ai";

import { chatTools } from "@/features/chat/tools/registry";

const glm = createOpenAICompatible({
  name: "glm",
  baseURL: "https://open.bigmodel.cn/api/coding/paas/v4",
  apiKey: process.env.GLM_API_KEY,
});

const qwen = createOpenAICompatible({
  name: "qwen",
  baseURL: "http://192.168.2.30:1234/v1",
});

const qwenWithToolExamples = wrapLanguageModel({
  model: qwen.chatModel("qwen/qwen3.5-9b"),
  middleware: addToolInputExamplesMiddleware(),
});

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();
  const now = new Date();
  const currentTimeLine = `Current server time is ${now.toISOString()} (UTC).`;

  const result = streamText({
    // model: glm.chatModel("glm-4.7"),
    model: qwenWithToolExamples,
    system:
      `You are a mobile assistant inside an Expo app. ${currentTimeLine} Use the available tools whenever the user asks for real device data such as weather, HealthKit sleep data, step count, contacts, calendar events, current time, or current location. For write actions like creating calendar events, ask follow-up questions until the event title, start time, and end time are clear and concrete. Prefer the current-time tool whenever the user asks about now, today, or needs a precise time reference. If a tool approval is denied, do not immediately retry the same tool unless the user explicitly asks again.`,
    messages: await convertToModelMessages(messages),
    // providerOptions: {
    //   glm: {
    //     thinking: { type: "disabled" },
    //   },
    // },
    // onChunk: ({ chunk }) => {
    //   console.log("[chat+api] stream chunk", chunk);
    // },
    stopWhen: stepCountIs(5),
    tools: chatTools,
  });

  return result.toUIMessageStreamResponse({
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "none",
    },
  });
}

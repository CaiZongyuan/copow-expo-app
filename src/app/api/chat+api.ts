import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { convertToModelMessages, stepCountIs, streamText, UIMessage } from "ai";

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

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    // model: glm.chatModel("glm-4.7"),
    model: qwen.chatModel("qwen/qwen3.5-9b"),
    system:
      "You are a mobile assistant inside an Expo app. Use the available tools whenever the user asks for real device data such as weather, HealthKit sleep data, step count, contacts, calendar events, or current location.",
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

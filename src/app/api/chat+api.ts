import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import {
  addToolInputExamplesMiddleware,
  APICallError,
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  RetryError,
  stepCountIs,
  streamText,
  type UIMessage,
  wrapLanguageModel,
} from "ai";

import {
  buildChatTools,
  buildToolContext,
} from "@/features/chat/tools/registry";

const glm = createOpenAICompatible({
  name: "glm",
  baseURL: "https://open.bigmodel.cn/api/coding/paas/v4",
  apiKey: process.env.GLM_API_KEY,
});

// const qwen = createOpenAICompatible({
//   name: "qwen",
//   baseURL: "http://localhost:1234/v1",
//   apiKey: process.env.GLM_API_KEY,
// });

const qwenWithToolExamples = wrapLanguageModel({
  // model: qwen.chatModel("qwen/qwen3.5-9b"),
  model: glm.chatModel("glm-5"),
  middleware: addToolInputExamplesMiddleware(),
});

const CHAT_STREAM_HEADERS = {
  "Content-Type": "application/octet-stream",
  "Content-Encoding": "none",
};

function getApiErrorFromRetryError(error: RetryError) {
  return APICallError.isInstance(error.lastError) ? error.lastError : undefined;
}

function getChatErrorMessage(error: unknown) {
  const retryApiError = RetryError.isInstance(error)
    ? getApiErrorFromRetryError(error)
    : undefined;
  const apiError = APICallError.isInstance(error) ? error : retryApiError;
  const errorText = [
    error instanceof Error ? error.message : "Unknown chat error.",
    apiError?.message,
    typeof apiError?.responseBody === "string"
      ? apiError.responseBody
      : undefined,
  ]
    .filter(Boolean)
    .join("\n");

  if (apiError?.statusCode === 429 || errorText.includes("速率限制")) {
    return "请求过于频繁，模型服务暂时限流。请稍等几秒后重试。";
  }

  if (
    errorText.includes("Request timed out") ||
    errorText.includes("Cannot connect")
  ) {
    return "模型服务暂时不可用或请求超时。请稍后再试。";
  }

  return "聊天请求失败，请稍后重试。";
}

function logChatError(error: unknown) {
  const retryApiError = RetryError.isInstance(error)
    ? getApiErrorFromRetryError(error)
    : undefined;
  const apiError = APICallError.isInstance(error) ? error : retryApiError;

  console.error("[chat+api] chat stream failed", {
    errorName: error instanceof Error ? error.name : typeof error,
    message: error instanceof Error ? error.message : String(error),
    statusCode: apiError?.statusCode,
    reason: RetryError.isInstance(error) ? error.reason : undefined,
    providerMessage:
      typeof apiError?.responseBody === "string"
        ? apiError.responseBody
        : undefined,
  });
}

export async function POST(req: Request) {
  try {
    const { messages }: { messages: UIMessage[] } = await req.json();
    const now = new Date();
    const currentTimeLine = `Current server time is ${now.toISOString()} (UTC).`;
    const toolContext = buildToolContext({
      platform: req.headers.get("x-chat-platform"),
    });

    const result = streamText({
      // model: glm.chatModel("glm-4.7"),
      model: qwenWithToolExamples,
      system: `You are a mobile assistant inside an Expo app. ${currentTimeLine} Use the available tools whenever the user asks for real device data such as weather, HealthKit sleep data, step count, contacts, calendar events, current time, or current location. For write actions like creating calendar events, ask follow-up questions until the event title, start time, and end time are clear and concrete. Prefer the current-time tool whenever the user asks about now, today, or needs a precise time reference. If a tool approval is denied, do not immediately retry the same tool unless the user explicitly asks again.`,
      messages: await convertToModelMessages(messages),
      maxRetries: 1,
      // providerOptions: {
      //   glm: {
      //     thinking: { type: "disabled" },
      //   },
      // },
      // onChunk: ({ chunk }) => {
      //   console.log("[chat+api] stream chunk", chunk);
      // },
      onError: ({ error }) => {
        logChatError(error);
      },
      stopWhen: stepCountIs(8),
      tools: buildChatTools(toolContext),
    });

    return result.toUIMessageStreamResponse({
      headers: CHAT_STREAM_HEADERS,
      onError: (error) => {
        logChatError(error);
        return getChatErrorMessage(error);
      },
    });
  } catch (error) {
    logChatError(error);

    return createUIMessageStreamResponse({
      headers: CHAT_STREAM_HEADERS,
      stream: createUIMessageStream({
        execute() {
          throw error;
        },
        onError: (streamError) => getChatErrorMessage(streamError),
      }),
    });
  }
}

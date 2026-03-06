import { executeMobileTool } from "@/features/chat/tools/mobile-executors";
import { isMobileToolName, toolLabels } from "@/features/chat/tools/registry";
import { generateAPIUrl } from "@/utils/APIURLGenerator";
import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { fetch as expoFetch } from "expo/fetch";
import { useState } from "react";
import { FlatList, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function getToolPartName(part: { type: string }) {
  return part.type.startsWith("tool-") ? part.type.slice(5) : undefined;
}

function getToolLabel(part: { type: string }) {
  const toolName = getToolPartName(part);

  if (!toolName) {
    return "Tool";
  }

  return toolLabels[toolName as keyof typeof toolLabels] ?? toolName;
}

function getMessageKey(messageId: string, messageIndex: number) {
  return `${messageIndex}-${messageId}`;
}

function getMessagePartKey(
  messageId: string,
  messageIndex: number,
  partIndex: number
) {
  return `${messageIndex}-${messageId}-${partIndex}`;
}

function minutesToReadableDuration(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) {
    return `${minutes}m`;
  }

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
}

function formatToolOutput(toolName: string | undefined, output: any) {
  if (!toolName || !output) {
    return JSON.stringify(output, null, 2);
  }

  switch (toolName) {
    case "get_today_steps":
      return [`Date: ${output.date}`, `Steps: ${output.steps} ${output.unit}`].join("\n");
    case "get_recent_sleep":
      return [
        `Days checked: ${output.days}`,
        `Sleep entries: ${output.sampleCount}`,
        `Total sleep: ${minutesToReadableDuration(output.totalSleepMinutes)}`,
        ...(output.entries ?? [])
          .slice(0, 5)
          .map(
            (entry: any) =>
              `- ${entry.stage}: ${minutesToReadableDuration(entry.durationMinutes)} (${formatDateTime(entry.startDate)})`
          ),
      ].join("\n");
    case "search_contacts":
      return [
        `Query: ${output.query}`,
        `Matches: ${output.total}`,
        ...(output.contacts ?? []).map((contact: any) => {
          const phone = contact.phoneNumbers?.[0] ? ` | ${contact.phoneNumbers[0]}` : "";
          const email = contact.emails?.[0] ? ` | ${contact.emails[0]}` : "";
          const company = contact.company ? ` (${contact.company})` : "";

          return `- ${contact.name}${company}${phone}${email}`;
        }),
      ].join("\n");
    case "get_upcoming_events":
      return [
        `Window: ${formatDateTime(output.rangeStart)} -> ${formatDateTime(output.rangeEnd)}`,
        `Events: ${output.total}`,
        ...(output.events ?? []).map(
          (event: any) =>
            `- ${event.title} | ${formatDateTime(event.startDate)} | ${event.calendarTitle}${event.location ? ` | ${event.location}` : ""}`
        ),
      ].join("\n");
    case "get_current_location":
      return [
        `Coordinates: ${output.latitude}, ${output.longitude}`,
        `Accuracy: ${output.accuracy ?? "unknown"}`,
        output.address?.formattedAddress
          ? `Address: ${output.address.formattedAddress}`
          : output.address
            ? `Address: ${[
                output.address.name,
                output.address.city,
                output.address.region,
                output.address.country,
              ]
                .filter(Boolean)
                .join(", ")}`
            : "Address: unavailable",
      ].join("\n");
    default:
      return JSON.stringify(output, null, 2);
  }
}

function renderToolState(part: any) {
  const toolName = getToolPartName(part);

  switch (part.state) {
    case "input-streaming":
      return "Preparing tool input...";
    case "input-available":
      return part.input ? JSON.stringify(part.input, null, 2) : "Running tool...";
    case "output-available":
      return formatToolOutput(toolName, part.output);
    case "output-error":
      return part.errorText ?? "Tool execution failed.";
    case "approval-requested":
      return "Waiting for user approval...";
    case "approval-responded":
      return JSON.stringify(part.approval, null, 2);
    default:
      return JSON.stringify(part, null, 2);
  }
}

export default function App() {
  const [input, setInput] = useState("");
  const { addToolOutput, messages, error, sendMessage } = useChat({
    transport: new DefaultChatTransport({
      fetch: expoFetch as unknown as typeof globalThis.fetch,
      api: generateAPIUrl("/api/chat"),
    }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onToolCall: async ({ toolCall }) => {
      if (toolCall.dynamic || !isMobileToolName(toolCall.toolName)) {
        return;
      }

      try {
        const output = await executeMobileTool(toolCall.toolName, toolCall.input);

        addToolOutput({
          tool: toolCall.toolName,
          toolCallId: toolCall.toolCallId,
          output,
        });
      } catch (toolError) {
        addToolOutput({
          state: "output-error",
          tool: toolCall.toolName,
          toolCallId: toolCall.toolCallId,
          errorText:
            toolError instanceof Error
              ? toolError.message
              : "Unknown mobile tool error.",
        });
      }
    },
    onError: (chatError) => console.error(chatError, "ERROR"),
  });

  if (error) return <Text className="text-red-500">{error.message}</Text>;

  return (
    <SafeAreaView className="h-full bg-white dark:bg-neutral-950">
      <View className="h-[95%] flex-col px-2">
        <FlatList
          className="flex-1"
          data={messages}
          keyExtractor={(message, messageIndex) =>
            getMessageKey(message.id, messageIndex)
          }
          keyboardShouldPersistTaps="handled"
          renderItem={({ item: message, index: messageIndex }) => (
            <View className="my-2">
              <View>
                <Text className="font-bold text-neutral-900 dark:text-neutral-100">
                  {message.role}
                </Text>
                {message.parts.map((part, index) => {
                  const partKey = getMessagePartKey(
                    message.id,
                    messageIndex,
                    index
                  );

                  switch (part.type) {
                    case "text":
                      return (
                        <Text
                          key={partKey}
                          className="text-base text-neutral-900 dark:text-neutral-100"
                        >
                          {part.text}
                        </Text>
                      );
                    case "reasoning":
                      return (
                        <View
                          key={partKey}
                          className="my-1 rounded-md bg-slate-100 p-2 dark:bg-neutral-800"
                        >
                          <Text className="text-xs font-semibold text-slate-500 dark:text-neutral-400">
                            Reasoning:
                          </Text>
                          <Text className="text-sm italic text-slate-700 dark:text-neutral-200">
                            {part.text}
                          </Text>
                        </View>
                      );
                    default:
                      if (!part.type.startsWith("tool-")) {
                        return null;
                      }

                      return (
                        <View
                          key={partKey}
                          className="my-1 rounded-md border-l-4 border-emerald-500 bg-emerald-50 p-2 dark:bg-emerald-950/30"
                        >
                          <Text className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            {getToolLabel(part)}
                          </Text>
                          <Text className="font-mono text-xs text-emerald-700 dark:text-emerald-300">
                            {renderToolState(part)}
                          </Text>
                        </View>
                      );
                  }
                })}
              </View>
            </View>
          )}
        />

        <View className="mt-2">
          <TextInput
            className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
            placeholder="Say something..."
            placeholderTextColor="#9ca3af"
            value={input}
            onChange={(event) => setInput(event.nativeEvent.text)}
            onSubmitEditing={(event) => {
              event.preventDefault();

              if (!input.trim()) {
                return;
              }

              sendMessage({ text: input });
              setInput("");
            }}
            autoFocus={true}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

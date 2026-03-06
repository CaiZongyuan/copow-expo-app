import { executeMobileTool } from "@/features/chat/tools/mobile-executors";
import {
  isMobileToolName,
  toolLabels,
  toolRequiresConfirmation,
} from "@/features/chat/tools/registry";
import { generateAPIUrl } from "@/utils/APIURLGenerator";
import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  isToolUIPart,
  lastAssistantMessageIsCompleteWithToolCalls,
  type UIMessage,
} from "ai";
import { fetch as expoFetch } from "expo/fetch";
import { useRef, useState } from "react";
import { FlatList, Pressable, Text, TextInput, View } from "react-native";
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

function formatToolInput(toolName: string | undefined, input: any) {
  if (!toolName || !input) {
    return JSON.stringify(input, null, 2);
  }

  switch (toolName) {
    case "list_writable_calendars":
      return [`Include hidden: ${input.includeHidden ? "yes" : "no"}`].join(
        "\n"
      );
    case "open_external_url":
      return [
        input.label ? `Label: ${input.label}` : null,
        input.appName ? `App: ${input.appName}` : null,
        input.intent ? `Intent: ${input.intent}` : null,
        `URL: ${input.url}`,
        input.fallbackUrl ? `Fallback: ${input.fallbackUrl}` : null,
      ]
        .filter(Boolean)
        .join("\n");
    case "create_calendar_event":
      return [
        `Title: ${input.title}`,
        `Starts: ${formatDateTime(input.startDate)}`,
        `Ends: ${formatDateTime(input.endDate)}`,
        `All day: ${input.allDay ? "yes" : "no"}`,
        input.location ? `Location: ${input.location}` : null,
        input.notes ? `Notes: ${input.notes}` : null,
        input.calendarId
          ? `Calendar ID: ${input.calendarId}`
          : "Calendar: default writable calendar",
      ]
        .filter(Boolean)
        .join("\n");
    default:
      return JSON.stringify(input, null, 2);
  }
}

function formatToolOutput(toolName: string | undefined, output: any) {
  if (!toolName || !output) {
    return JSON.stringify(output, null, 2);
  }

  switch (toolName) {
    case "get_current_time":
      return [
        `Date: ${output.date}`,
        `Time: ${output.time}`,
        `Timezone: ${output.timeZone}`,
        `ISO: ${output.nowIso}`,
      ].join("\n");
    case "list_writable_calendars":
      return [
        `Writable calendars: ${output.total}`,
        ...(output.calendars ?? []).map((calendar: any) => {
          const details = [
            calendar.sourceName,
            calendar.ownerAccount,
            calendar.isPrimary ? "primary" : null,
            calendar.isVisible ? null : "hidden",
          ]
            .filter(Boolean)
            .join(" | ");

          return details
            ? `- ${calendar.title} | ${details}`
            : `- ${calendar.title}`;
        }),
      ].join("\n");
    case "open_external_url":
      return [
        `Status: ${output.status}`,
        output.appName ? `App: ${output.appName}` : null,
        output.intent ? `Intent: ${output.intent}` : null,
        output.label ? `Label: ${output.label}` : null,
        `Opened: ${output.openedUrl}`,
        output.usedFallback ? `Requested: ${output.requestedUrl}` : null,
      ]
        .filter(Boolean)
        .join("\n");
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
    case "create_calendar_event":
      return [
        `Status: ${output.status}`,
        `Calendar: ${output.calendarTitle}`,
        `Title: ${output.title}`,
        `Starts: ${formatDateTime(output.startDate)}`,
        `Ends: ${formatDateTime(output.endDate)}`,
        output.location ? `Location: ${output.location}` : null,
        output.notes ? `Notes: ${output.notes}` : null,
      ]
        .filter(Boolean)
        .join("\n");
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
      return part.input ? formatToolInput(toolName, part.input) : "Running tool...";
    case "output-available":
      return formatToolOutput(toolName, part.output);
    case "output-error":
      return part.errorText ?? "Tool execution failed.";
    case "approval-requested":
      return [
        "Approval required before this tool can run.",
        formatToolInput(toolName, part.input),
      ].join("\n");
    case "approval-responded":
      return [
        part.approval?.approved ? "Approved on device." : "Denied on device.",
        part.approval?.reason,
        formatToolInput(toolName, part.input),
      ]
        .filter(Boolean)
        .join("\n");
    default:
      return JSON.stringify(part, null, 2);
  }
}

function shouldAutoContinue(messages: UIMessage[]) {
  if (lastAssistantMessageIsCompleteWithToolCalls({ messages })) {
    return true;
  }

  const lastMessage = messages[messages.length - 1];

  if (!lastMessage || lastMessage.role !== "assistant") {
    return false;
  }

  const lastStepStartIndex = lastMessage.parts.reduce((lastIndex, part, index) => {
    return part.type === "step-start" ? index : lastIndex;
  }, -1);

  const toolParts = lastMessage.parts
    .slice(lastStepStartIndex + 1)
    .filter(isToolUIPart);

  if (toolParts.length === 0) {
    return false;
  }

  const hasDeniedApproval = toolParts.some(
    (part) =>
      part.state === "approval-responded" && part.approval.approved === false
  );

  if (!hasDeniedApproval) {
    return false;
  }

  return toolParts.every(
    (part) =>
      part.state === "output-available" ||
      part.state === "output-error" ||
      (part.state === "approval-responded" && part.approval.approved === false)
  );
}

function hasApprovedToolCall(messages: UIMessage[], toolCallId: string) {
  return messages.some((message) =>
    message.parts.some(
      (part) =>
        isToolUIPart(part) &&
        part.toolCallId === toolCallId &&
        part.state === "approval-responded" &&
        part.approval.approved
    )
  );
}

async function runApprovedMobileTool({
  toolName,
  toolCallId,
  input,
  addToolOutput,
}: {
  toolName: string;
  toolCallId: string;
  input: any;
  addToolOutput: (payload: any) => void;
}) {
  if (!isMobileToolName(toolName)) {
    return;
  }

  try {
    const output = await executeMobileTool(toolName, input);

    addToolOutput({
      tool: toolName,
      toolCallId,
      output,
    });
  } catch (toolError) {
    addToolOutput({
      state: "output-error",
      tool: toolName,
      toolCallId,
      errorText:
        toolError instanceof Error
          ? toolError.message
          : "Unknown mobile tool error.",
    });
  }
}

function getToolCardClassName(part: any) {
  if (part.state === "approval-requested") {
    return "my-1 rounded-md border-l-4 border-amber-500 bg-amber-50 p-2 dark:bg-amber-950/30";
  }

  if (
    part.state === "output-error" ||
    (part.state === "approval-responded" && part.approval?.approved === false)
  ) {
    return "my-1 rounded-md border-l-4 border-red-500 bg-red-50 p-2 dark:bg-red-950/30";
  }

  return "my-1 rounded-md border-l-4 border-emerald-500 bg-emerald-50 p-2 dark:bg-emerald-950/30";
}

function getToolLabelClassName(part: any) {
  if (part.state === "approval-requested") {
    return "text-xs font-semibold text-amber-700 dark:text-amber-300";
  }

  if (
    part.state === "output-error" ||
    (part.state === "approval-responded" && part.approval?.approved === false)
  ) {
    return "text-xs font-semibold text-red-700 dark:text-red-300";
  }

  return "text-xs font-semibold text-emerald-600 dark:text-emerald-400";
}

function getToolBodyClassName(part: any) {
  if (part.state === "approval-requested") {
    return "font-mono text-xs text-amber-800 dark:text-amber-200";
  }

  if (
    part.state === "output-error" ||
    (part.state === "approval-responded" && part.approval?.approved === false)
  ) {
    return "font-mono text-xs text-red-800 dark:text-red-200";
  }

  return "font-mono text-xs text-emerald-700 dark:text-emerald-300";
}

export default function App() {
  const [input, setInput] = useState("");
  const messagesRef = useRef<UIMessage[]>([]);
  const {
    addToolApprovalResponse,
    addToolOutput,
    messages,
    error,
    sendMessage,
  } = useChat({
    transport: new DefaultChatTransport({
      fetch: expoFetch as unknown as typeof globalThis.fetch,
      api: generateAPIUrl("/api/chat"),
    }),
    sendAutomaticallyWhen: ({ messages }) => shouldAutoContinue(messages),
    onToolCall: async ({ toolCall }) => {
      if (toolCall.dynamic || !isMobileToolName(toolCall.toolName)) {
        return;
      }

      if (toolRequiresConfirmation(toolCall.toolName)) {
        return;
      }

      await runApprovedMobileTool({
        toolName: toolCall.toolName,
        toolCallId: toolCall.toolCallId,
        input: toolCall.input,
        addToolOutput,
      });
    },
    onError: (chatError) => console.error(chatError, "ERROR"),
  });

  messagesRef.current = messages;

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
                      if (!isToolUIPart(part)) {
                        return null;
                      }

                       return (
                         <View
                           key={partKey}
                           className={getToolCardClassName(part)}
                         >
                           <Text className={getToolLabelClassName(part)}>
                             {getToolLabel(part)}
                           </Text>
                           <Text className={getToolBodyClassName(part)}>
                             {renderToolState(part)}
                           </Text>
                            {part.state === "approval-requested" ? (
                              <View className="mt-2 flex-row gap-2">
                                <Pressable
                                  className="flex-1 rounded-md bg-emerald-600 px-3 py-2"
                                  onPress={() => {
                                    if (
                                      !hasApprovedToolCall(
                                        messagesRef.current,
                                        part.toolCallId
                                      )
                                    ) {
                                      void (async () => {
                                        const toolName = getToolPartName(part);

                                        if (!toolName) {
                                          return;
                                        }

                                        await addToolApprovalResponse({
                                          id: part.approval.id,
                                          approved: true,
                                          reason:
                                            "User approved the tool on device.",
                                        });

                                        await runApprovedMobileTool({
                                          toolName,
                                          toolCallId: part.toolCallId,
                                          input: part.input,
                                          addToolOutput,
                                        });
                                      })();
                                    }
                                  }}
                                >
                                  <Text className="text-center text-sm font-semibold text-white">
                                    Approve
                                 </Text>
                               </Pressable>
                               <Pressable
                                 className="flex-1 rounded-md border border-red-300 bg-white px-3 py-2 dark:border-red-800 dark:bg-neutral-900"
                                 onPress={() => {
                                   void addToolApprovalResponse({
                                     id: part.approval.id,
                                     approved: false,
                                     reason: "User denied calendar change on device.",
                                   });
                                 }}
                               >
                                 <Text className="text-center text-sm font-semibold text-red-700 dark:text-red-300">
                                   Deny
                                 </Text>
                               </Pressable>
                             </View>
                           ) : null}
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

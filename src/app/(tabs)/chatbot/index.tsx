import { generateAPIUrl } from "@/utils/APIURLGenerator";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { fetch as expoFetch } from "expo/fetch";
import { useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function App() {
  const [input, setInput] = useState("");
  const { messages, error, sendMessage } = useChat({
    transport: new DefaultChatTransport({
      fetch: expoFetch as unknown as typeof globalThis.fetch,
      api: generateAPIUrl("/api/chat"),
    }),
    onError: (error) => console.error(error, "ERROR"),
  });

  if (error) return <Text>{error.message}</Text>;

  return (
    <SafeAreaView style={{ height: "100%" }}>
      <View
        style={{
          height: "95%",
          display: "flex",
          flexDirection: "column",
          paddingHorizontal: 8,
        }}
      >
        <ScrollView style={{ flex: 1 }}>
          {messages.map((m) => (
            <View key={m.id} style={{ marginVertical: 8 }}>
              <View>
                <Text style={{ fontWeight: 700 }}>{m.role}</Text>
                {m.parts.map((part, i) => {
                  switch (part.type) {
                    case "text":
                      return (
                        <Text key={`${m.id}-${i}`} style={{ fontSize: 16 }}>
                          {part.text}
                        </Text>
                      );
                    case "reasoning":
                      return (
                        <View
                          key={`${m.id}-${i}`}
                          style={{
                            backgroundColor: "#f3f4f6",
                            padding: 8,
                            borderRadius: 6,
                            marginVertical: 4,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 12,
                              color: "#6b7280",
                              fontWeight: "600",
                            }}
                          >
                            💭 Reasoning:
                          </Text>
                          <Text
                            style={{
                              fontSize: 14,
                              color: "#374151",
                              fontStyle: "italic",
                            }}
                          >
                            {part.text}
                          </Text>
                        </View>
                      );
                    case "tool-weather":
                    case "tool-convertFahrenheitToCelsius":
                      const toolName =
                        part.type === "tool-weather"
                          ? "🌤️ Weather Tool"
                          : "🌡️ Temperature Converter";
                      return (
                        <View
                          key={`${m.id}-${i}`}
                          style={{
                            backgroundColor: "#ecfdf5",
                            padding: 8,
                            borderRadius: 6,
                            marginVertical: 4,
                            borderLeftWidth: 3,
                            borderLeftColor: "#10b981",
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 12,
                              color: "#059669",
                              fontWeight: "600",
                            }}
                          >
                            {toolName}
                          </Text>
                          <Text
                            style={{
                              fontSize: 12,
                              color: "#047857",
                              fontFamily: "monospace",
                            }}
                          >
                            {JSON.stringify(part, null, 2)}
                          </Text>
                        </View>
                      );
                    default:
                      return null;
                  }
                })}
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={{ marginTop: 8 }}>
          <TextInput
            style={{ backgroundColor: "white", padding: 8 }}
            placeholder="Say something..."
            value={input}
            onChange={(e) => setInput(e.nativeEvent.text)}
            onSubmitEditing={(e) => {
              e.preventDefault();
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

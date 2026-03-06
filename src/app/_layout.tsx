import { Slot } from "expo-router";
import "../global.css";

import { HeroUINativeProvider } from "heroui-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

const config = {
  devInfo: {
    stylingPrinciples: false,
  },
};

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <HeroUINativeProvider config={config}>
        <Slot />
      </HeroUINativeProvider>
    </GestureHandlerRootView>
  );
}

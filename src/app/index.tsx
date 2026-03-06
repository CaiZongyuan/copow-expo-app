import { ButtonExample } from "@/components/Buntton";
import CardExample from "@/components/CardExample";
import { View } from "react-native";

export default function Index() {
  return (
    <View className="flex-1 justify-center items-center">
      <CardExample />
      <ButtonExample />
    </View>
  );
}

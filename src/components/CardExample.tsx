import { Ionicons } from "@expo/vector-icons";
import { Button, Card } from "heroui-native";
import { View } from "react-native";

export default function CardExample() {
  return (
    <Card>
      <View className="gap-4">
        <Card.Body className="mb-4">
          <View className="gap-1 mb-2">
            <Card.Title className="text-pink-500">$450</Card.Title>
            <Card.Title>Living room Sofa • Collection 2025</Card.Title>
          </View>
          <Card.Description>
            This sofa is perfect for modern tropical spaces, baroque inspired
            spaces.
          </Card.Description>
        </Card.Body>
        <Card.Footer className="gap-3">
          <Button variant="primary">Buy now</Button>
          <Button variant="ghost">
            <Button.Label>Add to cart</Button.Label>
            <Ionicons name="bag-outline" size={16} />
          </Button>
        </Card.Footer>
      </View>
    </Card>
  );
}

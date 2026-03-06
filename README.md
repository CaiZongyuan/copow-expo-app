# CoPow App

**English | [中文](README-zh.md)**

A React Native mobile app built with Expo, featuring an AI chatbot and native device integrations.

## Project Overview

This cross-platform mobile application is built with a modern tech stack and includes:

- 🤖 **AI Chat Assistant**: Integrated GLM-4.7 and Qwen models
- 🏥 **Health Data**: Apple HealthKit integration for steps, sleep, and more
- 📅 **Calendar Management**: Query and create calendar events
- 👥 **Contacts**: Search and manage contacts
- 📍 **Location Services**: Get current geographic location
- 🎨 **Modern UI**: Built with Uniwind + HeroUI Native

## Tech Stack

### Core Framework
- **Expo SDK 55** - Cross-platform mobile development framework
- **React 19** - UI library
- **React Native 0.83** - Native components
- **TypeScript** - Type safety

### Routing & Navigation
- **expo-router** - File-based routing system
- **React Navigation** - Navigation components

### AI Capabilities
- **Vercel AI SDK** - AI integration framework
- **@ai-sdk/react** - React hooks
- **GLM-4.7 / Qwen** - Large language models

### UI Components
- **HeroUI Native** - High-quality UI component library
- **Uniwind** - Tailwind-style utility classes
- **Tailwind CSS v4** - Utility-first CSS framework

### Native Modules
- **expo-calendar** - Calendar functionality
- **expo-contacts** - Contact management
- **expo-location** - Location services
- **expo-maps** - Maps service
- **@kingstinct/react-native-healthkit** - Apple HealthKit integration

### Animation & Gestures
- **react-native-reanimated** - High-performance animations
- **react-native-gesture-handler** - Gesture handling
- **@gorhom/bottom-sheet** - Bottom sheet component

## Development Setup

### Prerequisites
- Node.js 18+
- npm or bun
- iOS: Xcode (macOS only)
- Android: Android Studio

### Install Dependencies

```bash
# Using bun (recommended)
bun install
```

### Start Development Server

```bash
# Using bun
bunx expo
```

### Run the App

```bash
# iOS simulator or device
bun run ios

# Android emulator or device
bun run android
```

## Code Quality

### Type Checking

Always run type checking before committing or running the app:

```bash
npx tsc --noEmit
```

### Linting

```bash
bun run lint
```

## Project Structure

```
copow-app/
├── src/
│   ├── app/                    # expo-router route files
│   │   ├── (tabs)/            # Tab navigation
│   │   │   ├── chatbot/      # AI chat interface
│   │   │   └── index.tsx     # Home screen
│   │   ├── api/              # API routes
│   │   │   └── chat+api.ts   # Chat API
│   │   └── _layout.tsx       # Root layout
│   ├── components/            # Reusable components
│   ├── features/             # Feature modules
│   │   └── chat/            # Chat functionality
│   │       └── tools/       # AI tool registry
│   ├── utils/               # Utility functions
│   └── global.css           # Global styles
├── docs/                    # Project documentation
├── package.json
├── tsconfig.json
└── app.json                 # Expo configuration
```

## Core Features

### AI Chat Assistant

The app includes a powerful AI chatbot that supports:

- 💬 Natural language conversations
- 🛠️ Tool calling (time, health, calendar, contacts, location, etc.)
- 🔒 Operation confirmation flow (sensitive actions require user approval)
- 🌐 Multi-model support (GLM-4.7, Qwen)

### Available Tools

| Tool Name | Description | Requires Confirmation |
|-----------|-------------|----------------------|
| `get_current_time` | Get current time | No |
| `get_today_steps` | Get today's step count | No |
| `get_recent_sleep` | Get recent sleep data | No |
| `search_contacts` | Search contacts | No |
| `get_upcoming_events` | Get upcoming calendar events | No |
| `create_calendar_event` | Create calendar event | Yes |
| `get_current_location` | Get current location | No |
| `list_writable_calendars` | List writable calendars | No |
| `open_external_url` | Open external URL | No |

### Styling System

The project uses a multi-layer styling architecture:

1. **Uniwind** - Primary styling utility providing Tailwind-like class names
2. **Tailwind CSS v4** - Additional utility classes
3. **HeroUI Native** - Pre-built component library

#### Usage Example

```tsx
import { View, Text } from 'react-native';

// Using Uniwind class names
<View className="flex flex-row items-center justify-center p-4">
  <Text className="text-lg font-semibold text-blue-500">
    Hello World
  </Text>
</View>
```

## Configuration

### Environment Variables

Create a `.env` file with the following variables:

```bash
# GLM API Key
GLM_API_KEY=your_glm_api_key_here

# Qwen API URL (if using local deployment)
QWEN_BASE_URL=http://localhost:1234/v1
```

### TypeScript Path Aliases

Configured in `tsconfig.json`:

- `@/*` → `./src/*`
- `@/assets/*` → `./assets/*`

## Development Guide

### Adding New Routes

Create a new file in the `src/app/` directory:

```tsx
// src/app/profile.tsx
import { View, Text } from 'react-native';

export default function ProfileScreen() {
  return (
    <View>
      <Text>Profile</Text>
    </View>
  );
}
```

### Adding New Tools

1. Define the tool in `src/features/chat/tools/registry.ts`
2. Implement execution logic in `src/features/chat/tools/mobile-executors.ts`
3. Update tool labels and confirmation settings

## Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [expo-router Guide](https://docs.expo.dev/router/introduction/)
- [Vercel AI SDK](https://sdk.vercel.ai/)
- [HeroUI Native](https://heroui-native.com/)

## License

This project is proprietary.

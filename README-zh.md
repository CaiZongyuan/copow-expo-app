# CoPow App

一个基于 Expo 的 React Native 移动应用，集成了 AI 聊天机器人和多种原生设备功能。

## 项目概述

本项目采用现代化技术栈构建的跨平台移动应用，主要特性包括：

- 🤖 **AI 聊天助手**：集成 GLM-4.7 和 Qwen 模型
- 🏥 **健康数据**：Apple HealthKit 集成，支持步数、睡眠等健康数据查询
- 📅 **日历管理**：支持日历事件查询和创建
- 👥 **联系人**：支持搜索和管理联系人
- 📍 **位置服务**：获取当前地理位置信息
- 🎨 **现代化 UI**：使用 Uniwind + HeroUI Native 构建精美界面

## 技术栈

### 核心框架
- **Expo SDK 55** - 跨平台移动应用开发框架
- **React 19** - UI 库
- **React Native 0.83** - 原生组件
- **TypeScript** - 类型安全

### 路由与导航
- **expo-router** - 基于文件的路由系统
- **React Navigation** - 导航组件

### AI 能力
- **Vercel AI SDK** - AI 集成框架
- **@ai-sdk/react** - React hooks
- **GLM-4.7 / Qwen** - 大语言模型

### UI 组件
- **HeroUI Native** - 高质量 UI 组件库
- **Uniwind** - Tailwind 风格的样式工具
- **Tailwind CSS v4** - 实用优先的 CSS 框架

### 原生模块
- **expo-calendar** - 日历功能
- **expo-contacts** - 联系人管理
- **expo-location** - 位置服务
- **expo-maps** - 地图服务
- **@kingstinct/react-native-healthkit** - Apple HealthKit 集成

### 动画与手势
- **react-native-reanimated** - 高性能动画
- **react-native-gesture-handler** - 手势处理
- **@gorhom/bottom-sheet** - 底部弹出面板

## 开发环境设置

### 前置要求
- Node.js 18+
- npm 或 bun
- iOS: Xcode（仅 macOS）
- Android: Android Studio

### 安装依赖

```bash
# 使用 bun（推荐）
bun install
```

### 启动开发服务器

```bash
# 使用 bun
bunx expo
```

### 运行应用

```bash
# iOS 模拟器或设备
bun run ios

# Android 模拟器或设备
bun run android
```

## 代码质量

### 类型检查

在提交代码或运行应用前，务必执行类型检查：

```bash
npx tsc --noEmit
```

### 代码检查

```bash
bun run lint
```

## 项目结构

```
copow-app/
├── src/
│   ├── app/                    # expo-router 路由文件
│   │   ├── (tabs)/            # 标签页导航
│   │   │   ├── chatbot/      # AI 聊天界面
│   │   │   └── index.tsx     # 首页
│   │   ├── api/              # API 路由
│   │   │   └── chat+api.ts   # 聊天 API
│   │   └── _layout.tsx       # 根布局
│   ├── components/            # 可复用组件
│   ├── features/             # 功能模块
│   │   └── chat/            # 聊天功能
│   │       └── tools/       # AI 工具注册
│   ├── utils/               # 工具函数
│   └── global.css           # 全局样式
├── docs/                    # 项目文档
├── package.json
├── tsconfig.json
└── app.json                 # Expo 配置
```

## 核心功能

### AI 聊天助手

应用内置了功能强大的 AI 聊天助手，支持：

- 💬 自然语言对话
- 🛠️ 工具调用（时间、健康、日历、联系人、位置等）
- 🔒 操作确认流程（敏感操作需用户确认）
- 🌐 多模型支持（GLM-4.7、Qwen）

### 可用工具

| 工具名称 | 功能描述 | 需确认 |
|---------|---------|--------|
| `get_current_time` | 获取当前时间 | 否 |
| `get_today_steps` | 获取今日步数 | 否 |
| `get_recent_sleep` | 获取最近睡眠数据 | 否 |
| `search_contacts` | 搜索联系人 | 否 |
| `get_upcoming_events` | 获取即将到来的日历事件 | 否 |
| `create_calendar_event` | 创建日历事件 | 是 |
| `get_current_location` | 获取当前位置 | 否 |
| `list_writable_calendars` | 列出可写日历 | 否 |
| `open_external_url` | 打开外部链接 | 否 |

### 样式系统

项目采用多层样式架构：

1. **Uniwind** - 主要样式工具，提供类似 Tailwind 的类名
2. **Tailwind CSS v4** - 额外的工具类
3. **HeroUI Native** - 预构建组件库

#### 使用示例

```tsx
import { View, Text } from 'react-native';

// 使用 Uniwind 类名
<View className="flex flex-row items-center justify-center p-4">
  <Text className="text-lg font-semibold text-blue-500">
    Hello World
  </Text>
</View>
```

## 配置

### 环境变量

创建 `.env` 文件并配置以下变量：

```bash
# GLM API 密钥
GLM_API_KEY=your_glm_api_key_here

# Qwen API 地址（如果使用本地部署）
QWEN_BASE_URL=http://localhost:1234/v1
```

### TypeScript 路径别名

在 `tsconfig.json` 中配置：

- `@/*` → `./src/*`
- `@/assets/*` → `./assets/*`

## 开发指南

### 添加新路由

在 `src/app/` 目录下创建新文件：

```tsx
// srcapp/profile.tsx
import { View, Text } from 'react-native';

export default function ProfileScreen() {
  return (
    <View>
      <Text>Profile</Text>
    </View>
  );
}
```

### 添加新工具

1. 在 `src/features/chat/tools/registry.ts` 中定义工具
2. 在 `src/features/chat/tools/mobile-executors.ts` 中实现执行逻辑
3. 更新工具标签和确认配置

## 学习资源

- [Expo 文档](https://docs.expo.dev/)
- [React Native 文档](https://reactnative.dev/)
- [expo-router 指南](https://docs.expo.dev/router/introduction/)
- [Vercel AI SDK](https://sdk.vercel.ai/)
- [HeroUI Native](https://heroui-native.com/)

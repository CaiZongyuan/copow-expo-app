# Expo Dev Client 聊天 API 排障记录

## 症状 1

报错：`TypeError: Cannot read property 'replace' of undefined`

对应文件：`src/utils/APIURLGenerator.ts`

### 根因

开发环境里直接使用了：

```ts
Constants.experienceUrl.replace("exp://", "http://")
```

这在 `Expo Go` 里常见，但在 `dev client` 中，`Constants.experienceUrl` 可能是 `undefined`。

### 经验

- 不要假设 `dev client` 一定存在 `Constants.experienceUrl`
- 先判空，再调用 `.replace()`
- 开发环境优先尝试 `Constants.expoConfig?.hostUri`
- `Constants.linkingUri` 可以作为次级兜底
- 如果都拿不到，最后退回 `EXPO_PUBLIC_API_BASE_URL`

### 当前处理方式

`src/utils/APIURLGenerator.ts` 现在按以下顺序取开发环境地址：

1. `Constants.expoConfig?.hostUri`
2. `Constants.experienceUrl`
3. `Constants.linkingUri`
4. `process.env.EXPO_PUBLIC_API_BASE_URL`

如果仍然拿不到，会抛出明确错误，而不是在 `.replace()` 处崩溃。

## 症状 2

不再报错，但 `src/app/api/chat+api.ts` 没有收到请求或没有返回内容。

### 根因

项目使用了 Expo Router API routes（`+api.ts`），但 `app.json` 里没有启用：

```json
{
  "expo": {
    "web": {
      "output": "server"
    }
  }
}
```

在 Expo 开发环境中，如果没有 `web.output: "server"`，`+api` 路由通常不会被正确挂载。

### 经验

- 使用 `src/app/api/*.ts` 这类 Expo Router API routes 时，要显式配置 `web.output: "server"`
- 改完 `app.json` 后要完整重启 Expo dev server，热更新通常不够
- 仅修复前端请求地址，不足以让 `+api` 路由生效

### 当前处理方式

已在 `app.json` 中添加：

```json
"web": {
  "output": "server"
}
```

## 必做重启步骤

修改 API route 相关配置后，执行：

```bash
npx expo start --clear
```

然后重新打开 `dev client`。

## 额外检查项

如果聊天请求仍然没有返回，继续检查：

- `src/app/api/chat+api.ts` 中使用的 `GLM_API_KEY` 是否存在
- 启动 Expo 的终端进程是否读取到了 `.env.local`
- 当前手机/模拟器是否能访问开发机所在局域网地址
- 终端里是否出现 API route bundling 或 server 错误

## 结论

这次问题本质上分成两层：

1. `dev client` 下 `Constants.experienceUrl` 不可靠，导致前端 URL 生成崩溃
2. Expo Router 的 `+api` 路由缺少 `web.output: "server"` 配置，导致服务端路由未正常工作

以后遇到 `dev client + Expo Router API routes + 本地聊天接口` 场景，优先检查这两点。

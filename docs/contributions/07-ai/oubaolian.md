# AI 功能集成贡献说明

姓名：欧宝莲
学号：2312190401
日期：2026-04-16

## 我完成的工作

### 1. AI 功能
- 功能类型：智能客服
- 使用模型：Cloudflare Workers AI (@cf/meta/llama-3.1-8b-instruct)

### 2. 实现内容
- [x] 后端 API (controllers/ai.js, routes/ai.js)
- [x] 前端调用 (pages/ai/ai.ts, utils/api.ts)
- [x] 错误处理 (API 降级、网络异常处理)
- [x] 悬浮按钮入口 (pages/index/index)
- [x] 对话历史保留

### 3. 关键代码文件
- `backend/controllers/ai.js` - AI 控制器，支持多 Provider
- `backend/routes/ai.js` - AI 路由
- `frontend/miniprogram/pages/ai/ai.ts` - AI 聊天页面逻辑
- `frontend/miniprogram/pages/ai/ai.wxml` - AI 聊天页面模板
- `frontend/miniprogram/pages/ai/ai.scss` - AI 聊天页面样式
- `frontend/miniprogram/pages/index/index.wxml` - 悬浮按钮入口
- `frontend/miniprogram/utils/api.ts` - API 封装

## PR 链接
- PR #X: https://github.com/xxx/xxx/pull/X

## 心得体会
在 AI 集成过程中，主要遇到以下挑战和收获：

1. **API 选择**: 尝试了 Groq、DeepSeek、硅基流动等多个平台，最终选择 Cloudflare Workers AI 因其国内可访问且免费。

2. **架构设计**: 采用前端直接调用 Cloudflare API 的方式，避免后端中转，提高响应速度。

3. **错误处理**: 实现了完善的错误处理机制，包括网络异常、API 限流等情况的友好提示。

4. **对话体验**: 通过保留对话历史，让 AI 能够理解上下文，提供更连贯的回复。

# 安全审查报告

## 审查信息
- **审查日期**: 2026-04-29
- **审查人**: 欧宝莲
- **项目**: Campus-Help 校园互助平台
- **审查范围**: 后端核心代码（controllers、middleware、routes、utils）

## 审查方法
使用 OWASP Top 10 视角对后端代码进行安全审计，重点关注：
1. 注入漏洞（SQL / 命令注入）
2. 失效的访问控制（未授权接口）
3. 敏感信息明文暴露
4. 加密/认证是否缺失
5. 错误信息是否暴露内部细节

---

## 发现的安全问题

### 问题 1 [Critical]: AI 聊天接口无认证保护
- **文件**: `backend/routes/ai.js` 第 6 行
- **问题**: `/api/ai/chat` 接口未添加 `verifyToken` 中间件，任何人可无限调用 AI API，导致 API 配额被滥用和经济损失
- **OWASP 类别**: A01:2021 – Broken Access Control（失效的访问控制）
- **严重程度**: 🔴 Critical
- **修复方案**: 在路由中添加 `verifyToken` 中间件
```js
// 修复前
router.post('/chat', aiController.chat);
// 修复后
const { verifyToken } = require('../middleware/auth');
router.post('/chat', verifyToken, aiController.chat);
```
- **修复状态**: ✅ 已修复

### 问题 2 [High]: JWT Secret 硬编码弱回退值
- **文件**: `backend/utils/jwt.js` 第 2 行
- **问题**: 当环境变量 `JWT_SECRET` 未设置时，回退到硬编码弱密钥 `'campushelp'`，攻击者可伪造任意用户 token
- **OWASP 类别**: A02:2021 – Cryptographic Failures（加密机制失败）
- **严重程度**: 🟠 High
- **修复方案**: 移除回退值，启动时强制要求环境变量
```js
// 修复前
const SECRET = process.env.JWT_SECRET || 'campushelp';
// 修复后
const SECRET = process.env.JWT_SECRET;
if (!SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is not set');
}
```
- **修复状态**: ✅ 已修复

### 问题 3 [High]: 内部业务错误消息直接返回客户端
- **文件**: `backend/controllers/task.js` 多处（接单/完成/确认/取消/放弃任务）
- **问题**: `err.message` 直接返回给前端，泄露内部业务逻辑（如"不能接自己发布的任务"、"发布者余额不足"、"任务状态异常"等），攻击者可利用这些信息推断系统状态机
- **OWASP 类别**: A09:2021 – Security Logging and Monitoring Failures（安全日志和监控失败）
- **严重程度**: 🟠 High
- **修复方案**: 将内部错误映射为通用提示语，详细日志仅输出到服务端 console.error
- **修复状态**: ✅ 已修复（5 处 catch 块全部脱敏处理）

### 问题 4 [High]: CORS 配置完全开放
- **文件**: `backend/app.js` 第 15 行
- **问题**: `cors()` 默认允许所有来源，部署到公网后任何恶意网站都可发起跨域请求
- **OWASP 类别**: A05:2021 – Security Misconfiguration（安全配置错误）
- **严重程度**: 🟠 High
- **修复方案**: 收紧 CORS 为白名单模式，通过 `CORS_ORIGINS` 环境变量配置允许的域名
- **修复状态**: ✅ 已修复

### 问题 5 [High]: 缺少 .env.example 模板文件
- **问题**: 项目无 `.env.example` 文件，新开发者不知道需要配置哪些环境变量；且 `.env` 包含真实凭证可能已进入仓库历史
- **严重程度**: 🟠 High
- **修复方案**: 创建 `backend/.env.example` 占位符模板，`.gitignore` 已包含 `.env`
- **修复状态**: ✅ 已创建

### 问题 6 [Medium]: 上传头像错误可能泄露路径信息
- **文件**: `backend/controllers/user.js` 第 199 行
- **问题**: multer 错误的 `err.message` 可能包含文件系统路径信息返回给前端
- **严重程度**: 🟡 Medium
- **修复方案**: 返回通用错误 "上传失败，请重试"
- **修复状态**: ✅ 已修复

---

## 安全检查清单

| 检查项 | 状态 | 说明 |
|--------|------|------|
| **认证与授权** |
| 密码存储（bcrypt） | ✅ 通过 | bcryptjs 加盐哈希，salt rounds=10 |
| JWT 过期时间 | ⚠️ 需改进 | 7 天有效期，建议缩短至 24h 或实现刷新 token |
| Token 黑名单 / logout 失效 | ❌ 未实现 | 改密码后旧 token 仍有效，建议后续添加 Redis 黑名单 |
| 接口鉴权全覆盖 | ✅ 已修复 | AI 聊天接口已添加 verifyToken |
| 用户数据隔离 | ✅ 通过 | 任务操作均校验 publisher_id / acceptor_id 归属 |
| **注入防护** |
| SQL 注入防护 | ✅ 通过 | 全部使用参数化查询（占位符 ?）|
| XSS 防护 | ✅ 通过 | 后端纯 JSON API；小程序沙箱自动转义 |
| **敏感信息** |
| 无硬编码密码/API Key | ⚠️ 部分通过 | jwt.js 已修复；需轮换 .env 中已有凭证 |
| .env 在 .gitignore 中 | ✅ 通过 | .gitignore 第 5 行包含 `.env` |
| 存在 .env.example | ✅ 已创建 | 提供完整模板供参考 |
| **错误处理** |
| 错误消息不泄露内部细节 | ✅ 已修复 | 业务错误统一脱敏为通用提示 |
| 全局异常不返回 stack trace | ✅ 通过 | app.js 仅服务端记录 stack |
| **依赖安全** |
| Dependabot 已启用 | ✅ 通过 | 自动检测依赖漏洞并提 PR |

---

## CI 安全扫描配置

采用 **选项 A：密钥泄漏扫描（gitleaks）**

- 配置文件: `.github/workflows/security.yml`
- 工具: gitleaks v2 (GitHub Action)
- 触发条件: push 到 main/develop + PR to main
- 扫描范围: 全量 git 历史（fetch-depth: 0）
- 功能: 自动检测提交历史中的密钥/密码/token 泄漏

---

## 总结与后续建议

### 本次修复（6 项）
1. ✅ AI 聊天接口添加登录认证
2. ✅ JWT Secret 强制环境变量配置
3. ✅ 任务控制器 5 处错误消息脱敏
4. ✅ CORS 收紧为白名单模式
5. ✅ 创建 .env.example 模板
6. ✅ 上传头像错误信息脱敏

### 建议后续改进（P2）
- 实现 token 黑名单机制或 password_changed_at 校验
- 添加登录频率限制（防暴力破解）
- 为注册接口添加验证码/频率限制
- 轮换 .env 中已有的数据库密码和 CF Token（如已泄露到 Git 历史中）
- 使用 `express-rate-limit` 保护 AI 和登录等敏感接口
- 考虑添加 helmet.js 安全 HTTP 头中间件

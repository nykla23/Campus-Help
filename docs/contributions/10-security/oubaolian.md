# 安全加固贡献说明

姓名：欧宝莲  学号：2312190401  角色：前端 / 后端  日期：2026-04-29

## 完成的工作

### 必做项
- [x] **第一步：AI 辅助安全审查**
  - 使用 OWASP Top 10 视角对后端核心代码进行安全审计
  - 审计范围：controllers（5个）、middleware、routes（5个）、utils/jwt、app.js
  - 发现 6 个安全问题（Critical 1个 + High 4个 + Medium 1个）
  - 记录在 `docs/security-review.md`

- [x] **第二步：安全检查清单**
  - 认证与授权：bcrypt 密码存储 ✅、JWT 强制环境变量 ✅、接口鉴权全覆盖 ✅、token 黑名单待完善 ⚠️
  - 注入防护：参数化查询防 SQL 注入 ✅、小程序沙箱防 XSS ✅
  - 敏感信息：无硬编码密钥 ✅、.gitignore 含 .env ✅、新增 .env.example ✅
  - 错误处理：业务错误消息脱敏 ✅、全局异常不含 stack ✅
  - 依赖安全：Dependabot 已启用 ✅

- [x] **第三步：CI 自动化安全扫描（选项 A：密钥泄漏扫描）**
  - 创建 `.github/workflows/security.yml`，集成 gitleaks-action@v2
  - 触发时机：push (main/develop) + PR (main)
  - 扫描全量 git 历史（fetch-depth: 0）

### 修复的安全漏洞（6 项）

| # | 漏洞 | 严重性 | 修复文件 |
|---|------|--------|----------|
| 1 | AI 聊天接口无认证保护 | 🔴 Critical | `backend/routes/ai.js` |
| 2 | JWT Secret 硬编码弱回退值 | 🟠 High | `backend/utils/jwt.js` |
| 3 | 内部业务错误消息泄露 | 🟠 High | `backend/controllers/task.js` (5处) |
| 4 | CORS 完全开放 | 🟠 High | `backend/app.js` |
| 5 | 缺少 .env.example 模板 | 🟠 High | 新建 `backend/.env.example` |
| 6 | 上传错误可能泄露路径 | 🟡 Medium | `backend/controllers/user.js` |

## 代际适配
- [x] 本地测试命令与 CI 一致，无需额外配置
  ```bash
  npm run lint          # ESLint 零警告
  npm test              # 前端 Jest 全部通过
  npm run test:backend  # 后端 Jest 全部通过
  ```

## CI 运行链接
- https://github.com/nykla23/Campus-Help/actions

## 心得体会
本次安全作业让我深刻认识到 Web 应用安全的复杂性。主要收获：

1. **安全审计需要系统性思维**：从 OWASP Top 10 出发逐项排查，比零散检查更有效。例如发现 AI 接口漏加认证这种容易被忽略的问题。
2. **最小权限原则的重要性**：一个未授权的 AI 接口不仅影响功能安全，还可能导致直接的经济损失（API 配额滥用）。每个接口都应该有明确的访问控制策略。
3. **信息泄露的隐蔽性**：`err.message` 直接返回前端看似无害，但攻击者可以通过这些消息推断出完整的业务规则和状态机。安全开发应该遵循"默认拒绝，按需开放"的原则。
4. **DevSecOps 的实践价值**：通过 gitleaks CI 扫描可以在代码提交阶段自动发现密钥泄漏，比人工 review 更可靠。安全左移（Shift Left）理念在实际项目中非常有意义。

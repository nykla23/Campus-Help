# CI/CD 配置贡献说明

姓名：欧宝莲  学号：2312190401  角色：前端 / 后端  日期：2026-04-28

## 完成的工作

### 工作流相关
- [x] 创建 `.github/workflows/ci.yml`，拆分为 **backend** 和 **frontend** 并行 job
- [x] 配置 Codecov 覆盖率上传（`--flag=backend` 和 `--flag=frontend`）
- [x] 添加 README 状态徽章（backend / frontend flag=coverage）

### 代码审查
- [x] 代码通过 Lint 检查（ESLint `--max-warnings 0`）
- [x] 核心覆盖率达标（>60%）
  - 前端覆盖率：**72%** (lines)
  - 后端覆盖率：**92%** (lines)

### 可选
- [x] 配置 `.coderabbit.yaml` 实现 AI 自动代码审查
- [x] 配置 Dependabot 自动更新依赖

## 代际适配
- [x] 本地测试命令与 CI 一致，无需额外配置
  ```bash
  npm run lint          # ESLint 零警告
  npm test              # 前端 Jest 全部通过
  npm run test:backend  # 后端 Jest 全部通过
  ```

## CI 运行链接
- https://github.com/nykla23/Campus-Help/actions

## 遇到的问题和解决

### 问题 1：CI 找不到 lint 脚本
- **原因**：`package.json` 被压缩为单行 JSON，`npm ci` 在 Linux 下解析异常导致 scripts 丢失
- **解决**：使用 prettier 格式化为标准多行格式，重新生成 package-lock.json

### 问题 2：后端依赖缺失
- **原因**：`backend/package.json` 的运行时依赖（express/jsonwebtoken/bcryptjs）从未安装到 backend/node_modules/
- **解决**：CI workflow 新增 `cd backend && npm ci` 步骤；本地同步执行安装

### 问题 3：前端类型映射测试失败
- **原因**：测试期望值与 `getTypeText()` 实际实现偏移 1 位（多写了不存在的"全部"类型）
- **解决**：修正 `index.test.js` 的断言期望值与实际映射对齐

### 问题 4：AI 测试默认 provider 写错
- **原因**：`ai.js#L23` 默认 provider 为 `'cloudflare'`，测试误写为 `'groq'`
- **解决**：测试显式设置 `AI_PROVIDER='groq'` 走 groq 分支

### 问题 5：ESLint 22 个 warning 阻塞 `--max-warnings 0`
- **原因**：大量 catch 块中未使用的 err/e 变量、未使用的 import 等
- **解决**：
  - 未使用的参数统一加 `_` 前缀（`_err`, `_e`），配置 `caughtErrorsIgnorePattern: "^_"` 忽略
  - 删除真正无用的 import（如 `STATUS_MAP`, `TYPE_MAP`, `CODE`）

### 问题 6：Codecov 徽章显示 unknown
- **原因**：GitHub Secrets 未配置 `CODECOV_TOKEN`，CI 虽然步骤显示绿色但数据未真正上传
- **解决**：在仓库 Settings → Secrets → Actions 中添加 `CODECOV_TOKEN`，重新触发 CI 后数据成功上传
- **原因**：大量 catch 块中未使用的 err/e 变量、未使用的 import 等
- **解决**：
  - 未使用的参数统一加 `_` 前缀（`_err`, `_e`），配置 `caughtErrorsIgnorePattern: "^_"` 忽略
  - 删除真正无用的 import（如 `STATUS_MAP`, `TYPE_MAP`, `CODE`）

## 心得体会
本次作业完成了从零搭建完整 CI/CD 流水线的过程。核心收获包括：
1. monorepo 项目需要分目录安装依赖和配置独立的 lint/test 规则
2. ESLint v10 flat config 与 TypeScript 项目集成需要注意 parser 插件链的完整性
3. CI 环境与本地环境的差异（单行 JSON、缺少依赖、环境变量等）需要在本地充分验证后再提交
4. Codecov 覆盖率报告需要按 flag 区分前后端，便于在 README 中分别展示

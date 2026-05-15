# Docker 部署贡献说明

姓名：欧宝莲
学号：2312190401
日期：2026-05-15

## 我完成的工作

### 1. Dockerfile 编写

- [x] 前端 Dockerfile（多阶段构建）
  - `frontend/Dockerfile`：用于 CI 中运行 Jest 测试的基础镜像
  - 使用 `ode:20-alpine` 基础镜像，多阶段构建减小体积
- [x] 后端 Dockerfile（多阶段构建）
  - `backend/Dockerfile`：生产环境镜像，`CMD ["node", "app.js"]`，仅装生产依赖
  - `backend/Dockerfile.dev`：开发环境镜像，`CMD ["npx", "nodemon", "app.js"]`，支持热重载
  - 使用 `node:20-alpine` + `tini` 作为运行基础，非 root 用户 `appuser` 运行
  - 配置了 `HEALTHCHECK` 健康检查，通过 `/health` 端点检测服务状态
- [x] .dockerignore 文件
  - `backend/.dockerignore`：排除 `node_modules`、`.env`、`tests/`、`coverage/` 等
  - `frontend/.dockerignore`：排除 `node_modules`、`coverage/` 等

### 2. Compose 配置

- [x] 开发环境 compose.yaml
  - compose.yaml：挂载源码目录实现热重载，nodemon 监听文件变化自动重启
  - 数据库端口 3307:3306，后端端口 3000:3000
  - 环境变量直接写入配置，方便本地开发调试
- [x] 生产环境 compose.prod.yaml
  - compose.prod.yaml：从 GHCR 拉取镜像，支持资源限制（CPU/内存）
  - 密钥管理：使用 Docker secrets 管理 JWT 密钥（secrets/jwt_secret.txt）
  - 数据库端口仅绑定到 127.0.0.1:3307，不对外暴露
  - 数据库密码等敏感信息通过 .env 环境变量注入，不硬编码
- [x] 健康检查配置
  - 数据库：mysqladmin ping，间隔 10s（开发）/ 30s（生产）
  - 后端：GET /health 端点，返回 {"status":"ok"}

### 3. 自动化部署

- **选择了选项 A**：构建并推送镜像到 GHCR（GitHub Container Registry）
- **具体内容**：
  - `.github/workflows/deploy.yml`：CI/CD 流水线，分三个 job
    - `security-scan`：使用 Trivy 扫描后端代码的高危/严重漏洞
    - `test`：后端测试（MySQL 8.4 服务 + Jest）+ 前端测试
    - `build-and-push`：测试通过后构建 Docker 镜像并推送到 ghcr.io
  - 后端镜像标签：`ghcr.io/nykla23/campus-help-backend:latest` + `:短commitSHA`
  - 前端镜像标签：`ghcr.io/nykla23/campus-help-frontend:latest` + `:commitSHA`

### 4. 一键部署脚本

- `deploy.sh`：支持 `./deploy.sh`（生产）、`./deploy.sh dev`（开发）、`./deploy.sh down`（停止）、`./deploy.sh logs`（日志）、`./deploy.sh rebuild`（重建）

### 5. 部署验证

- 在 Ubuntu 24.04 虚拟机（VMware，NAT 模式，IP: 192.168.129.128）上成功部署
- 后端生产镜像：**161MB**（要求 < 300MB ✅）
- 全部满足部署检查清单

## 遇到的问题和解决

1. **Docker Hub 镜像拉取超时**：国内网络无法访问 docker.io → 配置镜像加速源（`docker.1ms.run` 等）并通过代理源手动拉取后打 tag
2. **npm ci 失败**：`package.json` 新增 `axios` 但 `package-lock.json` 未更新 → 改为 `npm install`
3. **数据库连接超时**：`.env` 中的 `DB_HOST=localhost` 覆盖了 Docker 环境变量 `DB_HOST=db` → 删除/备份本地 `.env` 文件
4. **端口被占用**：旧容器未停止 → 清理所有 campus-help 相关容器后重启

## AI 使用情况

- **使用了哪些 Prompt**：
  - "为 Node.js Express 项目编写多阶段构建 Dockerfile"
  - "编写 docker-compose 开发与生产配置，含资源限制和 Docker secrets"
  - "创建 GitHub Actions 工作流，含 trivy 扫描、测试、推送到 GHCR"
  - "编写一键部署脚本 deploy.sh"

- **AI 帮助解决了哪些问题**：
  - 排查 Docker 网络连接超时问题，指导配置镜像加速源
  - 定位 npm ci 失败原因
  - 分析数据库连接超时是 .env 文件覆盖问题

## 心得体会

本次任务我完成了项目容器化到一键部署的全流程。核心收获：
1. **容器化的价值**：Docker Compose 一键启动 MySQL + 后端，解决了手动启动的繁琐问题
2. **多阶段构建**：生产镜像从 208MB 减小到 161MB
3. **开发/生产分离**：`compose.yaml` 热重载 + `compose.prod.yaml` 资源限制/密钥管理，互不干扰
4. **网络环境挑战**：国内 Docker Hub 访问受限，需提前配置镜像加速
5. **环境变量陷阱**：Docker 环境变量容易被本地 `.env` 覆盖，部署时需注意排除

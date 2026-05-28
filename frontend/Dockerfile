# ===== 构建阶段 =====
FROM node:20-alpine AS builder

WORKDIR /app

# 依赖安装
COPY package.json package-lock.json ./
RUN npm ci && npm cache clean --force && rm -rf /root/.npm

# ===== 运行阶段 =====
FROM node:20-alpine

RUN apk add --no-cache tini

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# 从构建阶段复制 node_modules
COPY --from=builder /app/node_modules ./node_modules

# 复制前端源码（小程序代码 + 测试代码）
COPY package.json ./
COPY miniprogram/jest.config.js ./
COPY miniprogram/jest.setup.js ./
COPY tsconfig.json ./
COPY miniprogram/ ./miniprogram/
# COPY __tests__/ ./__tests__/ 2>/dev/null || true

# 设置权限
RUN chown -R appuser:appgroup /app

USER appuser

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD node -e "require('fs').existsSync('./package.json') ? process.exit(0) : process.exit(1)" || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["npm", "test"]

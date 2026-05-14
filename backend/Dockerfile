# ===== 构建阶段 =====
FROM node:20-alpine AS builder

WORKDIR /app

# 依赖安装 - 使用 npm install 替代 npm ci，避免 lockfile 不一致问题
COPY package.json package-lock.json ./
RUN npm install --only=production && \
    npm cache clean --force && \
    rm -rf /root/.npm

# ===== 运行阶段 =====
FROM node:20-alpine

# 安装 tini 用于优雅处理信号
RUN apk add --no-cache tini

# 创建非 root 用户
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# 从构建阶段复制 node_modules
COPY --from=builder /app/node_modules ./node_modules

# 复制源码
COPY app.js ./
COPY constants.js ./
COPY config/ ./config/
COPY controllers/ ./controllers/
COPY middleware/ ./middleware/
COPY models/ ./models/
COPY routes/ ./routes/
COPY utils/ ./utils/

# 创建上传目录并设置权限
RUN mkdir -p uploads/avatars && \
    chown -R appuser:appgroup /app

# 切换到非 root 用户
USER appuser

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

EXPOSE 3000

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "app.js"]

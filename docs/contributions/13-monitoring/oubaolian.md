

# 监控配置贡献说明

**姓名**：欧宝莲
**学号**：2312190401  
**日期**：2026-05-28

## 我完成的工作

### 1. 日志配置
- [x] 结构化日志格式（Winston + JSON）
- [x] 日志级别配置（通过 `LOG_LEVEL` 环境变量）
- [x] 日志含时间戳、级别、消息、模块名

### 2. 健康检查
- [x] `/health` 端点实现（返回服务状态 + 数据库健康）
- [x] 健康检查逻辑（检测数据库连接）
- [x] 返回 uptime、服务依赖状态

### 3. 指标收集
- [x] 请求计数（`http_request_total`）
- [x] 响应时间直方图（`http_request_duration_seconds`）
- [x] 错误率指标（`http_request_errors_total`，状态码 >= 400）
- [x] 活跃用户数（`active_users`，基于 WebSocket 连接）

### 4. 端点暴露
- [x] `GET /health` - 健康检查
- [x] `GET /metrics` - Prometheus 指标

## 涉及文件

| 文件 | 修改内容 |
|------|---------|
| `backend/utils/logger.js` | 配置 Winston JSON 结构化日志 |
| `backend/app.js` | 添加请求日志中间件、Socket.IO 活跃用户统计 |
| `backend/routes/health.js` | 实现健康检查端点（含数据库检测） |
| `backend/middleware/metrics.js` | 实现请求计数、响应时间、错误率、活跃用户数指标 |
| `docs/monitoring.md` | 更新监控配置说明 |

## 遇到的问题和解决

### 问题 1：健康检查路由路径错误
**解决**：`router.get('health', ...)` 缺少斜杠，修正为 `router.get('/', ...)`，因为 `app.js` 中已挂载到 `/health` 前缀。

### 问题 2：prom-client 异步方法
**解决**：`client.register.metrics()` 在新版本中为异步方法，添加 `await` 关键字。

```bash
# 健康检查
curl http://112.124.21.214:3000/health

# Prometheus 指标
curl http://112.124.21.214:3000/metrics | grep -E "http_request|active_users"
```

## 心得体会

通过本次监控配置，掌握了结构化日志、健康检查、指标收集等核心可观测性技术。理解了如何将应用状态暴露给外部监控系统，为后续的故障排查和自动化运维打下基础。
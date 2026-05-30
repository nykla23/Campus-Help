# 监控配置说明

## 1. 结构化日志

- 使用 `winston` 库，输出 JSON 格式。
- 日志级别：`info`（生产）、`debug`（开发），可通过环境变量 `LOG_LEVEL` 调整。
- 日志包含：时间戳、级别、消息、模块名、错误堆栈（如有）。
- 输出位置：控制台（stdout）和文件 `logs/app.log`。

## 2. 健康检查端点

- URL: `GET /health`
- 返回格式：
  ```json
  {
    "status": "ok",
    "timestamp": "2025-04-01T12:34:56.789Z",
    "uptime": 12345.67,
    "services": {
      "database": "up"
    }
  }

## 3. Prometheus 指标（/metrics 端点）

- `http_request_total` - 请求总数（按方法、路由、状态码分类）
- `http_request_duration_seconds` - 请求响应时间分布
- `http_request_errors_total` - 错误请求数（状态码 >= 400）
- `active_users` - 当前活跃用户数（基于 WebSocket 连接）

## 4. 查看监控数据

- 健康检查：`GET /health`
- 监控指标：`GET /metrics`（Prometheus 格式）
```

## 检查一下改完后是否完整

| 要求 | 状态 |
|------|:----:|
| JSON 格式日志（时间、级别、消息、模块） | ✅ |
| `/health` 健康检查端点 | ✅ |
| 请求计数 | ✅ |
| 响应时间 | ✅ |
| 错误率 | ✅  |
| 活跃用户数 | ✅  |

改完后重启容器：

```bash
docker compose -f compose.prod.yaml down
docker compose -f compose.prod.yaml up -d
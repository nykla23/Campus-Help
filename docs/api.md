# API 接口文档

基础URL：`http://localhost:3000/api`

## 用户模块

### 注册

- **POST** `/users/register`
- 请求体：`{ "username": "xxx", "password": "xxx", "studentId": "xxx" }`
- 响应：`{ "code": 0, "data": { "userId": 1, "token": "..." } }`

### 登录

- **POST** `/users/login`
- 请求体：`{ "username": "xxx", "password": "xxx" }`
- 响应：同上

## 任务模块

### 发布任务

- **POST** `/tasks` (需认证)
- 请求头：`Authorization: Bearer <token>`
- 请求体：`{ "title": "取快递", "description": "...", "reward": 10, "location": "菜鸟驿站" }`
- 响应：`{ "code": 0, "data": { "taskId": 1 } }`

### 获取任务列表

- **GET** `/tasks?page=1&limit=10`
- 响应：`{ "code": 0, "data": { "total": 100, "list": [...] } }`

### 接单

- **POST** `/tasks/:taskId/accept` (需认证)
- 响应：`{ "code": 0, "message": "接单成功" }`

### 确认完成任务

- **POST** `/tasks/:taskId/complete` (需认证，仅发布者可调用)
- 响应：`{ "code": 0, "message": "任务完成，虚拟币已划转" }`

## 评价模块

### 提交评价

- **POST** `/reviews` (需认证，任务完成后)
- 请求体：`{ "taskId": 1, "toUserId": 2, "rating": 5, "comment": "很好" }`
- 响应：`{ "code": 0, "data": { "reviewId": 1 } }`

## 状态码说明

- `0` 成功
- `1001` 参数错误
- `1002` 未认证
- `1003` 无权限
- `2001` 任务不存在
- ...（可根据需要补充）

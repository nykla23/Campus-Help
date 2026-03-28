# API 接口文档

基础 URL：`http://localhost:3000/api`
认证方式：除登录注册外，需要在请求头携带 `Authorization: Bearer <token>`。

## 通用响应格式

```json
{
  "code": 0,           // 状态码，0 表示成功，非0表示错误
  "data": {},          // 成功时返回的数据
  "message": "success" // 提示信息
}
```



## 状态码说明

| 状态码 | 含义                           |
|--------|-------------------------------|
| 0      | 成功                           |
| 1001   | 参数错误（缺失或格式不正确）   |
| 1002   | 未认证（token 缺失或无效）     |
| 1003   | 无权限（如操作他人资源）       |
| 1004   | 用户已存在                     |
| 1005   | 用户不存在或密码错误           |
| 1006   | 旧密码错误                     |
| 1007   | 两次密码输入不一致             |
| 2001   | 任务不存在                     |
| 2002   | 任务状态不允许当前操作         |
| 2003   | 任务已被接单                   |
| 2004   | 不能操作自己发布的任务         |
| 2005   | 余额不足                       |
| 3001   | 评价失败（任务未完成或已评价） |
| 3002   | 重复评价                       |
| 4001   | 虚拟币不足                     |
| 5000   | 服务器内部错误                 |



## 用户模块

### 注册

- **URL**：`POST /users`

- **请求体**：

  ```json
  {
    "username": "zhangsan",
    "nickname": "张三",
    "password": "123456",
    "confirmPassword":"123456"
  }
  ```

- **响应**：

  ```json
  {
    "code": 0,
    "data": {
      "userId": 1,
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    },
    "message": "注册成功"
  }
  ```

- **错误码**：1001（参数缺失/格式错误）、1004（用户名已存在）、1007（两次输入密码不一致）



### 登录

- **URL**：`POST /users/login`

- **请求体**：

  ```json
  {
    "username": "zhangsan",
    "password": "123456"
  }
  ```

- **响应**：同注册响应。

- **错误码**：1005（用户名或密码错误）



### 获取个人信息

- **URL**：`GET /users/profile`

- **请求头**：`Authorization: Bearer <token>`

- **响应**：

  ```json
  {
    "code": 0,
    "data": {
      "userId": 1,
      "username": "zhangsan",
      "nickname": "张三",
      "avatar": "https://example.com/avatar.jpg",
      "signature": "人生苦短，及时行乐",
      "creditScore": 100,
      "coins": 200,
      "createdAt": "2024-03-01T10:00:00Z"
    }
  }
  ```



### 更新个人信息

- **URL**：`PUT /users/profile`

- **请求头**：`Authorization: Bearer <token>`

- **请求体**（至少一项）：

  ```json
  {
    "nickname": "张三丰",
    "avatar": "https://example.com/new-avatar.jpg",
    "signature": "新的个性签名" 
  }
  ```

- **响应**：

  ```json
  { "code": 0, "message": "更新成功" }
  ```

  

### 修改密码

- **URL**：`PUT /users/password`

- **请求头**：`Authorization: Bearer <token>`

- **请求体**：

  ```json
  {
    "oldPassword": "123456",
    "newPassword": "654321"
  }
  ```

- **响应**：

  ```json
  { "code": 0, "message": "密码修改成功" }
  ```

- **错误码**：1006（旧密码错误）



## 任务模块

### 发布任务

- **URL**：`POST /tasks`

- **请求头**：`Authorization: Bearer <token>`

- **请求体**：

  ```json
  {
    "title": "取快递",
    "description": "韵达快递，取件码12345",
    "reward": 10,
    "location": "菜鸟驿站",
    "deadline": "2024-03-10T18:00:00Z"  // ISO 8601 格式，可选
  }
  ```

- **响应**：

  ```json
  {
    "code": 0,
    "data": { "taskId": 101 },
    "message": "发布成功"
  }
  ```

- **错误码**：2005（余额不足）



### 获取任务列表

- **URL**：`GET /tasks`

- **查询参数**（可选）：

  - `page`：页码，默认 1
  - `limit`：每页条数，默认 10
  - `status`：任务状态（0-待接单，1-进行中，2-待确认，3-已完成，4-已取消）
  - `sort`：排序方式，可选 `time`（最新）、`reward`（悬赏最高），默认 `time`

- **响应**：

  ```json
  {
    "code": 0,
    "data": {
      "total": 50,
      "list": [
        {
          "taskId": 101,
          "title": "取快递",
          "reward": 10,
          "location": "菜鸟驿站",
          "status": 0,
          "publisher": {
            "userId": 1,
            "nickname": "张三",
            "creditScore": 100
          },
          "createdAt": "2024-03-01T10:00:00Z"
        }
      ]
    }
  }
  ```

  

### 获取任务详情

- **URL**：`GET /tasks/:taskId`

- **响应**：

  ```json
  {
    "code": 0,
    "data": {
      "taskId": 101,
      "title": "取快递",
      "description": "韵达快递，取件码12345",
      "reward": 10,
      "location": "菜鸟驿站",
      "status": 0,
      "deadline": "2024-03-10T18:00:00Z",
      "publisher": {
        "userId": 1,
        "nickname": "张三",
        "avatar": "https://...",
        "creditScore": 100
      },
      "acceptor": null,  // 若已接单，则显示接单者信息
      "createdAt": "2024-03-01T10:00:00Z"
    }
  }
  ```

  

### 接单

- **URL**：`POST /tasks/:taskId/accept`

- **请求头**：`Authorization: Bearer <token>`

- **响应**：

  ```json
  { "code": 0, "message": "接单成功" }
  ```

- **错误码**：2001（任务不存在）、2003（任务已被接单）、2004（不能接自己发布的任务）

### 确认完成任务

- **URL**：`POST /tasks/:taskId/complete`

- **请求头**：`Authorization: Bearer <token>`

- **说明**：仅发布者可调用，将任务状态置为“已完成”，触发虚拟币划转。

- **响应**：

  ```json
  { "code": 0, "message": "任务完成，虚拟币已划转" }
  ```

- **错误码**：2002（任务状态不符、已完成/已取消）、2004（不能操作他人任务）



### 取消任务

- **URL**：`POST /tasks/:taskId/cancel`

- **请求头**：`Authorization: Bearer <token>`

- **说明**：仅发布者可调用，仅“待接单”状态可取消。

- **响应**：

  ```json
  { "code": 0, "message": "任务已取消" }
  ```

  

## 评价模块

### 提交评价

- **URL**：`POST /reviews`

- **请求头**：`Authorization: Bearer <token>`

- **请求体**：

  ```json
  {
    "taskId": 101,
    "toUserId": 2,
    "rating": 5,
    "comment": "速度很快，很靠谱"
  }
  ```

- **响应**：

  ```json
  { "code": 0, "data": { "reviewId": 10 }, "message": "评价成功" }
  ```

- **错误码**：3001（任务未完成或已评价）、3002（重复评价）



### 获取用户收到的评价

- **URL**：`GET /reviews`

- **查询参数**：

  - `userId`：目标用户 ID（必填）
  - `page`：默认 1
  - `limit`：默认 10

- **响应**：

  ```json
  {
    "code": 0,
    "data": {
      "total": 5,
      "list": [
        {
          "reviewId": 10,
          "fromUser": { "userId": 1, "nickname": "张三" },
          "rating": 5,
          "comment": "速度很快，很靠谱",
          "createdAt": "2024-03-02T10:00:00Z"
        }
      ]
    }
  }
  ```

  

## 虚拟币模块

### 获取交易记录

- **URL**：`GET /coins/transactions`

- **请求头**：`Authorization: Bearer <token>`

- **查询参数**：
  - `page`：页码，默认1
  - `limit`：每页条数，默认10

- **响应**：

  ```json
  {
    "code": 0,
    "data": {
      "balance": 200,
      "list": [
        {
          "type": 1,  // 1-收入，2-支出
          "amount": 10,
          "balance": 200,
          "description": "完成任务 取快递",
          "createdAt": "2024-03-02T10:00:00Z"
        }
      ]
    }
  }
  ```
  ---

## 全局说明

- 除注册、登录接口外，任意接口如未携带有效token，返回 1002（未认证）。
- 如操作他人资源/权限校验失败，返回 1003。
- 服务端异常返回 5000。
- 时间字段采用 ISO 8601 格式(`YYYY-MM-DDTHH:mm:ssZ`)。
- amount/reward 字段为虚拟币整数。
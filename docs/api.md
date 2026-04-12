# Campus Help API接口文档

基础URL：`http://localhost:3000/api`  
认证方式：**除注册/登录外，所有接口请求头需要携带** `Authorization: Bearer <token>`

---

## 通用响应格式

```json
{
  "code": 0,         // int：状态码，0 表示成功，非0为错误
  "data": {},        // object/array：业务数据
  "message": "success" // string：提示信息
}
```

---

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

---

## 1. 用户模块

### 1.1 用户注册

- **URL**：`POST /users`
- **请求体**：

  ```json
  {
    "username": "zhangsan",
    "nickname": "张三",            // 可选
    "password": "123456",
    "confirmPassword": "123456",   // 后端校验必须与 password 一致
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

---

### 1.2 用户登录

- **URL**：`POST /auth/login`
- **请求体**：

  ```json
  {
    "username": "zhangsan",
    "password": "123456"
  }
  ```
- **响应**：同【用户注册】响应
- **错误码**：1005（用户名或密码错误）

---

### 1.3 获取个人信息

- **URL**： `GET /users/profile`
- **请求头**： `Authorization: Bearer <token>`
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

---

### 1.4 更新个人信息

- **URL**： `PUT /users/profile`
- **请求头**： `Authorization: Bearer <token>`
- **请求体**（可选字段，至少一项）：

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

---

### 1.5 修改密码

- **URL**： `PUT /users/password`
- **请求头**： `Authorization: Bearer <token>`
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

---

## 2. 任务模块

### 2.1 发布任务

- **URL**： `POST /tasks`
- **请求头**： `Authorization: Bearer <token>`
- **请求体**：

  ```json
  {
    "title": "取快递",
    "description": "韵达快递，取件码12345",
    "reward": 10,
    "location": "菜鸟驿站",
    "type": 1, // 1-取件代送，2-跑腿代办，3-学习辅导，4-其他
    "deadline": "2024-03-10T18:00:00Z"  // ISO8601格式，可选
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

---

### 2.2 获取任务列表

- **URL**： `GET /tasks`
- **查询参数**（均可选，可以任意组合）：
  - `page`：页码，默认1
  - `limit`：每页条数，默认10
  - `status`：任务状态（0待接取、1进行中、2待确认、3已完成、4已取消）
  - `type`：任务类型（0全部，1-取件代送，2-跑腿代办，3-学习辅导，4-其他）
  - `sort`：排序方式，`time`（默认，最新）/`reward`（悬赏最大）
  - `publisher_id`：发布者ID筛选
  - `acceptor_id`：接单者ID筛选
- **响应**：

  ```json
  {
    "code": 0,
    "data": {
      "total": 50,
      "page": 1,
      "limit": 10,
      "list": [
        {
          "taskId": 101,
          "title": "取快递",
          "description": "描述...",
          "type": 1,
          "reward": 10,
          "location": "菜鸟驿站",
          "status": 0,
          "publisher": {
            "userId": 1,
            "nickname": "张三",
            "creditScore": 100
          },
          "acceptor": null,
          "createdAt": "2024-03-01T10:00:00Z",
          "deadline": "2024-03-10T18:00:00Z"
        }
      ]
    }
  }
  ```

---

### 2.3 获取任务详情

- **URL**： `GET /tasks/{taskId}`
- **响应**：

  ```json
  {
    "code": 0,
    "data": {
      "taskId": 101,
      "title": "取快递",
      "description": "韵达快递，取件码12345",
      "type": 1,
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
      "acceptor": null,  // 已接单则展示接单者信息
      "createdAt": "2024-03-01T10:00:00Z"
    }
  }
  ```

---

### 2.4 接单

- **URL**：`POST /tasks/{taskId}/accept`
- **请求头**：`Authorization: Bearer <token>`
- **响应**：

  ```json
  { "code": 0, "message": "接单成功" }
  ```
- **错误码**：2001（任务不存在）、2003（已被接单）、2004（不能接自己任务）

---

### 2.5 确认完成任务

- **URL**：`POST /tasks/{taskId}/complete`
- **请求头**：`Authorization: Bearer <token>`
- **说明**：**仅发布者可调用**，完成任务并触发虚拟币划转
- **响应**：

  ```json
  { "code": 0, "message": "任务完成，虚拟币已划转" }
  ```
- **错误码**：2002（任务状态不符、已完成/已取消）、2004（不能操作他人任务）

---

### 2.6 取消任务

- **URL**：`POST /tasks/{taskId}/cancel`
- **请求头**：`Authorization: Bearer <token>`
- **说明**：仅发布者可调用，仅“待接取”时可取消
- **响应**：

  ```json
  { "code": 0, "message": "任务已取消" }
  ```

---

## 3. 评价模块

### 3.1 提交评价

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

---

### 3.2 获取用户收到的评价

- **URL**：`GET /reviews`
- **查询参数**：
  - `userId`：目标用户 ID（必填，为收到的评价）
  - `page`：页码，默认1
  - `limit`：每页条数，默认10
- **响应**：

  ```json
  {
    "code": 0,
    "data": {
      "total": 5,
      "page": 1,
      "limit": 10,
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

---

## 4. 虚拟币模块

### 4.1 获取交易记录

- **URL**：`GET /transactions`
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
      "total": 2,
      "page": 1,
      "limit": 10,
      "list": [
        {
          "type": 1,        // 1-收入，2-支出
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

- 所有接口建议统一返回HTTP 200（错误通过 code 字段区分）。
- 未认证(token失效/缺失)返回 1002。
- 权限校验失败返回1003。
- 服务端异常返回 5000。
- 所有时间字段为 ISO 8601 格式 (`YYYY-MM-DDTHH:mm:ssZ`)。
- `amount`/`reward`/`coins` 等均为整数。
- 敏感信息如 password 绝不明文传输。
- 可根据实际需求扩展上传、搜索、举报等接口。

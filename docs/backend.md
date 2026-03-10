# 后端模块说明

## 1. 模块功能概述

后端模块基于 Node.js + Express 提供 RESTful API 服务，负责处理业务逻辑、数据存储和认证授权。核心功能包括：

- 用户注册、登录、JWT 身份认证。
- 任务的增删改查、状态流转（发布、接单、完成、取消）。
- 虚拟币的冻结、划转及交易记录。
- 评价的提交与查询。
- （可选）聊天记录存储。



## 2. 技术选型

| 技术     | 版本                 | 说明                         |
| :------- | :------------------- | :--------------------------- |
| 运行环境 | Node.js 16+          | 服务器端 JavaScript 运行环境 |
| Web 框架 | Express 4.18+        | 轻量级 Web 框架              |
| 数据库   | MySQL 8.0+           | 关系型数据库                 |
| 认证     | JSON Web Token (JWT) | 无状态认证                   |
| 密码加密 | bcryptjs 2.4+        | 用户密码哈希                 |
| 环境变量 | dotenv 16.0+         | 管理配置信息                 |
| 跨域     | cors 2.8+            | 处理跨域请求                 |
| 日志     | morgan + winston     | 请求日志和错误日志           |



## 3. 目录结构

```text
backend/
├── config/                     # 配置文件
│   ├── db.js                   # 数据库连接配置
│   ├── jwt.js                  # JWT 密钥和过期时间
│   └── index.js                # 统一导出配置
├── controllers/                # 控制器（处理请求逻辑）
│   ├── userController.js
│   ├── taskController.js
│   └── reviewController.js
├── middleware/                 # 中间件
│   ├── auth.js                 # JWT 验证中间件
│   ├── errorHandler.js         # 全局错误处理
│   └── validator.js            # 请求参数校验
├── models/                     # 数据模型（数据库操作）
│   ├── User.js
│   ├── Task.js
│   └── Review.js
├── routes/                      # 路由定义
│   ├── userRoutes.js
│   ├── taskRoutes.js
│   └── reviewRoutes.js
├── utils/                       # 工具函数
│   ├── logger.js                # 日志工具
│   ├── response.js              # 统一响应格式
│   └── db.js                    # 数据库连接池
├── app.js                        # Express 应用入口
├── server.js                     # 启动脚本
├── .env                          # 环境变量（不提交到仓库）
├── package.json
└── README.md                     # 后端说明
```



## 4. 数据库设计

### 4.1 表结构

#### 用户表（users）

| 字段         | 类型         | 约束                                                  | 说明         |
| :----------- | :----------- | :---------------------------------------------------- | :----------- |
| id           | INT          | PRIMARY KEY AUTO_INCREMENT                            | 用户 ID      |
| username     | VARCHAR(50)  | UNIQUE NOT NULL                                       | 用户名       |
| password     | VARCHAR(255) | NOT NULL                                              | 加密后的密码 |
| student_id   | VARCHAR(20)  | UNIQUE                                                | 学号（可选） |
| nickname     | VARCHAR(50)  |                                                       | 昵称         |
| avatar       | VARCHAR(255) |                                                       | 头像 URL     |
| credit_score | INT          | DEFAULT 100                                           | 信用分       |
| coins        | INT          | DEFAULT 100                                           | 虚拟币余额   |
| created_at   | DATETIME     | DEFAULT CURRENT_TIMESTAMP                             | 注册时间     |
| updated_at   | DATETIME     | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 更新时间     |

#### 任务表（tasks）

| 字段         | 类型         | 约束                                                  | 说明                                             |
| :----------- | :----------- | :---------------------------------------------------- | :----------------------------------------------- |
| id           | INT          | PRIMARY KEY AUTO_INCREMENT                            | 任务 ID                                          |
| publisher_id | INT          | FOREIGN KEY (users.id)                                | 发布者 ID                                        |
| acceptor_id  | INT          | DEFAULT NULL                                          | 接单者 ID                                        |
| title        | VARCHAR(100) | NOT NULL                                              | 任务标题                                         |
| description  | TEXT         |                                                       | 详细描述                                         |
| reward       | INT          | NOT NULL                                              | 悬赏虚拟币                                       |
| location     | VARCHAR(100) |                                                       | 地点                                             |
| status       | TINYINT      | DEFAULT 0                                             | 0-待接单，1-进行中，2-待确认，3-已完成，4-已取消 |
| deadline     | DATETIME     |                                                       | 截止时间                                         |
| created_at   | DATETIME     | DEFAULT CURRENT_TIMESTAMP                             | 发布时间                                         |
| updated_at   | DATETIME     | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 更新时间                                         |

#### 评价表（reviews）

| 字段         | 类型     | 约束                       | 说明        |
| :----------- | :------- | :------------------------- | :---------- |
| id           | INT      | PRIMARY KEY AUTO_INCREMENT | 评价 ID     |
| task_id      | INT      | FOREIGN KEY (tasks.id)     | 关联任务 ID |
| from_user_id | INT      | FOREIGN KEY (users.id)     | 评价人 ID   |
| to_user_id   | INT      | FOREIGN KEY (users.id)     | 被评价人 ID |
| rating       | TINYINT  | CHECK (1-5)                | 评分        |
| comment      | TEXT     |                            | 评语        |
| created_at   | DATETIME | DEFAULT CURRENT_TIMESTAMP  | 评价时间    |

#### 交易记录表（transactions）【可选】

| 字段        | 类型         | 约束                       | 说明                           |
| :---------- | :----------- | :------------------------- | :----------------------------- |
| id          | INT          | PRIMARY KEY AUTO_INCREMENT | 记录 ID                        |
| user_id     | INT          | FOREIGN KEY (users.id)     | 用户 ID                        |
| type        | TINYINT      | NOT NULL                   | 1-收入，2-支出，3-冻结，4-解冻 |
| amount      | INT          | NOT NULL                   | 金额                           |
| balance     | INT          | NOT NULL                   | 交易后余额                     |
| task_id     | INT          |                            | 关联任务 ID（可选）            |
| description | VARCHAR(255) |                            | 描述                           |
| created_at  | DATETIME     | DEFAULT CURRENT_TIMESTAMP  | 交易时间                       |

## 5. 核心业务逻辑

### 5.1 用户认证

- 注册时密码使用 `bcryptjs` 哈希存储。
- 登录成功后生成 JWT，包含用户 ID、用户名，有效期 7 天。
- 受保护接口需在请求头携带 `Authorization: Bearer <token>`，通过 `auth` 中间件验证并解析用户信息挂载到 `req.user`。

### 5.2 任务状态机

- **待接单 (0)**：发布后初始状态，可被接单，发布者可取消。
- **进行中 (1)**：接单后状态，等待发布者确认完成。
- **待确认 (2)**：接单者标记完成（可选功能），发布者可确认完成。
- **已完成 (3)**：发布者确认完成，虚拟币划转，可评价。
- **已取消 (4)**：发布者取消任务（仅待接单状态可取消），冻结币解冻。

### 5.3 虚拟币事务

- **发布任务**：检查余额 ≥ reward，扣除 reward 并冻结（可记录到冻结字段或单独冻结表），插入交易记录（类型=3）。
- **完成任务**：使用数据库事务更新：
  - 发布者：减去 reward（已冻结，无需再减），记录支出。
  - 接单者：增加 reward，记录收入。
  - 任务状态改为已完成。
  - 删除或更新冻结记录。
- **取消任务**：解冻 reward，返还发布者余额。

### 5.4 评价逻辑

- 任务完成后 7 天内可评价，逾期自动默认好评（5星）。

- 评价后更新被评价人的信用分（每得到一个差评（≤3星）扣5分，好评（≥4星）加1分）。

- 每个任务只允许评价一次，由任务双方分别评价对方。

  

## 6. API 接口概要（详见 API 接口文档）



## 7. 运行方式

### 7.1 环境准备

- 安装 Node.js (v16+) 和 MySQL (8.0+)
- 创建数据库，例如 `campus_help`

### 7.2 配置与启动

1. 进入 `backend` 目录，执行 `npm install` 安装依赖。

2. 复制 `.env.example` 为 `.env`，修改配置：

   ```text
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=yourpassword
   DB_NAME=campus_help
   JWT_SECRET=your_jwt_secret_key
   PORT=3000
   ```

3. 初始化数据库：执行 `db/init.sql` 创建表（可提供 SQL 文件）。

4. 启动服务：

   ```bash
   npm start
   ```

   或使用 `nodemon` 开发模式：

   ```bash
   npm run dev
   ```

5. 服务默认运行在 `http://localhost:3000`。

### 7.3 测试

- 可使用 Postman 或 curl 测试接口，确保返回正确结果。

## 8. 安全与性能

- 所有数据库操作使用参数化查询或 ORM 防止 SQL 注入。
- JWT 存储在客户端，服务端无状态，减轻存储压力。
- 密码哈希使用 bcrypt，计算密集型，可适当调整迭代次数。
- 接口限流（可选）：可引入 `express-rate-limit` 防止暴力破解。
# 后端模块说明

## 模块功能

- 用户认证（JWT）
- 任务管理（CRUD）
- 虚拟币交易
- 评价系统
- 聊天记录存储（可选）

## 技术选型

- 运行环境：Node.js
- 框架：Express
- 数据库：MySQL
- 认证：jsonwebtoken
- 其他：cors, dotenv, bcryptjs

## 目录结构

backend/
├── controllers/ # 控制器
│ ├── userController.js
│ ├── taskController.js
│ └── reviewController.js
├── models/ # 数据模型
│ ├── User.js
│ ├── Task.js
│ └── Review.js
├── routes/ # 路由
│ ├── userRoutes.js
│ ├── taskRoutes.js
│ └── reviewRoutes.js
├── middleware/ # 中间件（auth、errorHandler）
├── config/ # 配置文件（数据库连接）
├── app.js # 应用入口
└── server.js # 启动文件

## 运行方式

1. 安装Node.js和MySQL。
2. 在 `backend` 目录下执行 `npm install` 安装依赖。
3. 创建数据库，修改 `config/db.js` 中的数据库连接信息。
4. 执行 `npm start` 启动服务（默认端口3000）。
5. 可使用Postman测试接口。
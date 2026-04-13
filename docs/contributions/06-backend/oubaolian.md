# 校园帮小程序项目 - 全栈开发贡献说明

**姓名**：欧宝莲
**学号**：2312190401
**技术栈**：微信小程序 + Node.js(Express) + MySQL  
**日期**：2026-04-13  

------

## 一、我完成的工作

### 1. 后端开发（Node.js + Express + MySQL）

#### API 实现（全部自研，RESTful 风格）

- **用户认证**：注册、登录接口（JWT token，有效期7天），中间件 `auth` 统一验证，并自动将 `userId` 映射到 `req.user.id`。
- **任务管理**：
  - 发布任务（POST `/api/tasks`）：扣减发布者虚拟币，状态为待接取（0）。
  - 任务列表（GET `/api/tasks`）：支持分页、状态筛选、类型筛选、关键词搜索、排序（按时间/信用分）。
  - 任务详情（GET `/api/tasks/:id`）：关联发布者与接单者信息（LEFT JOIN users）。
  - 接单（POST `/api/tasks/:id/accept`）：状态改为进行中（1），记录接单者。
  - 接单者提交完成（POST `/api/tasks/:id/complete`）：状态改为待确认（2），不结算。
  - 发布者确认完成（POST `/api/tasks/:id/confirm`）：状态改为已完成（3），结算虚拟币，插入交易记录。
  - 取消任务（POST `/api/tasks/:id/cancel`）：仅待接取状态可取消，返还虚拟币。
  - 放弃任务（POST `/api/tasks/:id/giveup`）：接单者放弃，状态恢复为待接取。
- **个人主页**：
  - 获取个人信息及统计（GET `/api/user/profile`）：返回用户信息 + 虚拟币、信用分、完成委托数。
  - 我发布的任务列表（GET `/api/user/tasks/publish`）。
  - 我接单的任务列表（GET `/api/user/tasks/receive`）。
  - 交易记录（GET `/api/user/trades`）：从 `transactions` 表查询，支持收入/支出区分。
  - 修改昵称、个性签名（POST `/api/user/update`）：动态构建 SQL，只更新传入字段。
  - 修改密码（POST `/api/user/change-password`）：验证原密码，bcrypt 加密后更新。
  - 上传头像（POST `/api/user/upload-avatar`）：使用 multer 存储图片，返回访问 URL，并提供静态服务。
- **消息系统**：
  - 消息列表（GET `/api/messages/list`）：按「任务 + 对方用户」聚合，每个对话显示最新一条消息预览。
  - 聊天详情（GET `/api/messages/chat/:taskId/:targetId`）：返回两人关于某任务的全部消息（按时间升序）。
  - 发送消息（POST `/api/messages/send`）：插入 messages 表。
- **统一响应**：`{ code, data, message }`，全局错误处理中间件。

#### 数据库设计

- `users`：id, username, password, nickname, avatar, signature, coins, credit_score
- `tasks`：id, title, description, reward, location, type, status, publisher_id, acceptor_id, created_at, deadline
- `messages`：id, from_id, to_id, task_id, content, created_at
- `transactions`：id, user_id, type, amount, balance, task_id, description, created_at
- 所有外键关联均使用 `LEFT JOIN` 保证数据完整性，事务处理确保资金安全。

#### 服务与部署

- 使用 `express.static` 配置静态资源目录，支持头像访问。
- 配置 CORS，支持小程序本地开发联调。
- 环境变量管理（JWT_SECRET、数据库连接等），nodemon 热重载。

------

### 2. 前端开发（微信小程序）

#### 页面开发（全部自主实现）

- **登录/注册页**：表单校验，调用后端接口存储 token 和 userId。
- **首页（任务列表）**：
  - 搜索栏（防抖）、状态标签（全部/待接单/进行中/已完成）、类型筛选横条。
  - 任务卡片：头像、昵称、信用分、标题、描述、类型标签、地点、虚拟币、时间。
  - 滚动分页（`scroll-view` 触底加载更多），修复了首次分页不生效的问题。
  - 下拉刷新、上拉加载。
- **任务详情页**：
  - 展示完整任务信息，发布者/接单者卡片，根据状态和用户角色动态显示操作按钮（接单、取消、提交完成、放弃、确认完成等）。
  - 私信发布者/接单者，跳转聊天页。
- **发布任务页**：表单收集类型、标题、描述、奖励、地点、截止时间，发布成功后返回首页并刷新列表。
- **个人主页**：
  - 展示头像、昵称、个性签名、虚拟币、信用分、完成委托数。
  - 标签切换：我发布的、我接单的、交易记录。
  - 任务卡片可点击跳转详情，交易记录区分收入/支出。
  - 设置菜单（弹窗）：修改昵称、修改个性签名、更换头像、修改密码。
- **消息列表页**：显示每个对话的最新消息预览、对方昵称、时间，点击进入聊天详情页。
- **聊天详情页**：
  - 顶部显示对方昵称和任务标题。
  - 消息气泡（左右区分，带时间显示），时间分割线（超过5分钟显示日期）。
  - 底部输入框，发送消息后自动刷新并滚动到底部。

#### 组件/模块封装

- 统一网络请求模块 `utils/api.ts`：封装 `wx.request`，自动添加 token，处理 GET 参数拼接。
- 时间格式化工具（相对时间、分割线逻辑）。
- 任务状态/类型映射函数（复用）。

#### API 对接

- 封装所有后端接口（约20个），处理 loading 状态和错误提示。
- 实现文件上传（`wx.uploadFile`）用于头像。

------

## 二、主要问题与解决方案

| 问题                                                       | 解决方案                                                     |
| ---------------------------------------------------------- | ------------------------------------------------------------ |
| `router.post()` 报 `handler must be a function`            | 统一 auth 中间件导出方式，使用 `auth.verifyToken` 或改为默认导出。 |
| 任务列表分页失效，始终返回第一页                           | 修复 `api.ts` 中 GET 请求未传递 `data` 参数的问题，改为直接传递对象。 |
| 滚动加载更多不触发                                         | 改用 flex 布局固定 `scroll-view` 高度，绑定 `bindscrolltolower` 并实现 `onScrollToLower`。 |
| 发布任务后首页不显示新任务                                 | 在 `onShow` 中重置筛选条件（activeTab=0, activeType=0, keyword=''）并刷新列表。 |
| 个人主页任务卡片不显示字段                                 | 添加适配函数 `adaptTaskItem`，将后端字段（description/reward/type/status）映射为前端卡片所需字段。 |
| 交易记录支出显示为收入                                     | 修改 `adaptTradeItem`，根据后端返回的 `type` 数字（1收入/2支出）映射为 `income`/`expense`。 |
| 完成委托数始终为0                                          | 后端统计 SQL 中 status 条件从 2（待确认）改为 3（已完成）。  |
| 进行中状态发布者看不到“完成任务”按钮                       | 区分角色：接单者显示“提交完成”，发布者显示提示文字。         |
| 消息列表只显示一个对话                                     | 修改后端 `getMsgList` 按「任务 + 对方用户」分组，每个任务独立显示。 |
| 聊天页历史消息不显示                                       | 修复后端 `getChatDetail` 的 SQL 条件，确保 `task_id` 匹配，且双方 ID 正确。 |
| 头像上传成功但小程序加载 500                               | 配置 `express.static` 提供静态访问，并在前端使用完整 URL（含 `http://localhost:3000`）加时间戳防缓存。 |
| 修改密码报 `changePassword is not defined`                 | 在前端 `profile.ts` 中正确导入 `changePassword` 函数。       |
| 弹窗取消按钮无效                                           | 在 `hideAllPopups` 中统一关闭所有弹窗标志并清空临时数据。    |
| 个人主页点击设置图标无反应                                 | 修正按钮绑定事件，将 `toSetting` 改为 `showSettingMenu`。    |
| 聊天页面不能滚动到底部、样式错乱                           | 设置 `scroll-into-view`，修复左右消息气泡样式与结构。        |
| userId 字符串与 acceptor.id 数字类型不匹配导致权限判断失效 | 统一使用 `Number()` 转换，或在 wxml 中使用 `==` 宽松比较。   |

------

## 三、心得体会

从项目启动到最终联调成功，我独立完成了整个**全栈开发工作**，包括小程序前端页面搭建、权限逻辑处理、聊天功能实现、个人中心与信息修改，同时完成后端接口开发、数据库设计、文件上传配置以及前后端联调。

在开发过程中，我熟练掌握了：

- **前端**：小程序渲染逻辑、数据绑定、权限判断、弹窗交互、滚动分页、图片上传、WebSocket 模拟（轮询）。
- **后端**：Express 构建 RESTful API，JWT 身份验证，中间件设计，MySQL 联表查询与事务处理，文件上传与静态服务，环境变量管理。
- **调试与协作**：通过浏览器开发者工具、微信开发者工具进行接口测试，定位并解决类型不匹配、缓存、跨域、分页等一系列实际问题。

这次项目让我真正理解了全栈开发的完整流程——从需求分析、数据库设计、接口编写，到前端页面实现、联调测试、部署配置。我的独立解决问题能力和工程化思维得到了极大提升，为后续参与更复杂的项目打下了坚实基础。
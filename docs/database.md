# 数据库设计

## 表结构



#### 用户表（users）

| 字段           | 类型            | 约束                                                  | 说明             |
| :------------- | :-------------- | :---------------------------------------------------- | :--------------- |
| id             | INT             | PRIMARY KEY AUTO_INCREMENT                            | 用户 ID          |
| username       | VARCHAR(50)     | UNIQUE NOT NULL                                       | 用户名           |
| password       | VARCHAR(255)    | NOT NULL                                              | 加密后的密码     |                        
| nickname       | VARCHAR(50)     |                                                       | 昵称             |
| avatar         | VARCHAR(255)    |                                                       | 头像 URL         |
| credit_score   | INT             | DEFAULT 100                                           | 信用分           |
| coins          | INT             | DEFAULT 100                                           | 虚拟币余额       |
| created_at     | DATETIME        | DEFAULT CURRENT_TIMESTAMP                             | 注册时间         |
| updated_at     | DATETIME        | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 更新时间         |

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

#### 交易记录表（transactions）

| 字段        | 类型         | 约束                       | 说明                               |
| :---------- | :----------- | :------------------------- | :--------------------------------- |
| id          | INT          | PRIMARY KEY AUTO_INCREMENT | 记录 ID                            |
| user_id     | INT          | FOREIGN KEY (users.id)     | 用户 ID                            |
| type        | TINYINT      | NOT NULL                   | 1-收入，2-支出 |
| amount      | INT          | NOT NULL                   | 金额                               |
| balance     | INT          | NOT NULL                   | 交易后余额                         |
| task_id     | INT          |                            | 关联任务 ID    |
| description | VARCHAR(255) |                            | 描述                               |
| created_at  | DATETIME     | DEFAULT CURRENT_TIMESTAMP  | 交易时间                           |


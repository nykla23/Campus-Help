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
|signature       |VARCHAR(200)     |                                                       |个性签名          |

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
| type         | TINYINT      | DEFAULT 0                                             | 任务类型：0-全部 1-取件代送 2-跑腿代办 3-学习辅导 4-其他 |
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

## 2. 建表 SQL



```sql
-- 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS campus_help CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE campus_help;

-- 用户表
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL COMMENT '用户名',
    password VARCHAR(255) NOT NULL COMMENT '加密密码',
    nickname VARCHAR(50) COMMENT '昵称',
    avatar VARCHAR(255) ,
    signature VARCHAR(200) COMMENT '个性签名',
    COMMENT '头像URL',
    credit_score INT DEFAULT 100 COMMENT '信用分',
    coins INT DEFAULT 100 COMMENT '虚拟币余额',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE users ADD signature VARCHAR(255) DEFAULT '';

-- 任务表
CREATE TABLE tasks (
    id INT PRIMARY KEY AUTO_INCREMENT,
    publisher_id INT NOT NULL COMMENT '发布者ID',
    acceptor_id INT DEFAULT NULL COMMENT '接单者ID',
    title VARCHAR(100) NOT NULL COMMENT '任务标题',
    description TEXT COMMENT '详细描述',
    reward INT NOT NULL COMMENT '悬赏虚拟币',
    location VARCHAR(100) COMMENT '地点',
    type TINYINT DEFAULT 0 COMMENT '任务类型：0-全部 1-取件代送 2-跑腿代办 3-学习辅导 4-其他', -- 新增字段
    status TINYINT DEFAULT 0 COMMENT '0-待接单 1-进行中 2-待确认 3-已完成 4-已取消',
    deadline DATETIME COMMENT '截止时间',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (publisher_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (acceptor_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_status (status),
    INDEX idx_type (type), -- 新增类型索引，筛选更快
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 评价表
CREATE TABLE reviews (
    id INT PRIMARY KEY AUTO_INCREMENT,
    task_id INT NOT NULL COMMENT '关联任务ID',
    from_user_id INT NOT NULL COMMENT '评价人ID',
    to_user_id INT NOT NULL COMMENT '被评价人ID',
    rating TINYINT NOT NULL CHECK (rating BETWEEN 1 AND 5) COMMENT '评分1-5',
    comment TEXT COMMENT '评语',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_task_from_to (task_id, from_user_id, to_user_id) COMMENT '同一任务每人只能评价一次',
    INDEX idx_to_user (to_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- （可选）交易记录表，用于记录虚拟币流水
CREATE TABLE transactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL COMMENT '用户ID',
    type TINYINT NOT NULL COMMENT '1-收入 2-支出 3-冻结 4-解冻',
    amount INT NOT NULL COMMENT '金额',
    balance INT NOT NULL COMMENT '交易后余额',
    task_id INT DEFAULT NULL COMMENT '关联任务ID',
    description VARCHAR(255) COMMENT '描述',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL,
    INDEX idx_user_created (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```



## 3. 索引说明

- `users.username`：加速登录查询。
- `tasks.status` 和 `tasks.created_at`：优化任务列表筛选和排序。
- `reviews.to_user_id`：快速获取用户收到的评价。
- `transactions.user_id, created_at`：查询用户交易流水。


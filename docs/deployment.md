# 部署说明

## 云服务器信息
- **平台**：阿里云 ECS
- **地域**：华东1（杭州）
- **公网 IP**：112.124.21.214
- **操作系统**：Ubuntu 22.04 LTS

## 访问地址
- API 根路径：`http://112.124.21.214:3000`
- 健康检查：`http://112.124.21.214:3000/health`

## 部署步骤
1. 使用 SSH 登录服务器
2. 安装 Node.js 20.x、MySQL 8.0、pm2
3. 克隆代码仓库
4. 安装依赖 `npm install`
5. 配置 `.env` 环境变量
6. 导入数据库表结构
7. 使用 pm2 启动应用：`pm2 start app.js --name campus-api`
8. 设置开机自启：`pm2 save && pm2 startup`

## 环境变量列表
| 变量名 | 说明 |
|--------|------|
| PORT | 服务端口 |
| JWT_SECRET | JWT 密钥 |
| DB_HOST | 数据库主机 |
| DB_USER | 数据库用户 |
| DB_PASSWORD | 数据库密码 |
| DB_NAME | 数据库名称 |

## 自动部署（可选）
暂未配置 GitHub Actions，计划后续添加。
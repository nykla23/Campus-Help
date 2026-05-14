#!/bin/bash
#
# Campus-Help 一键部署脚本
# 用法:
#   ./deploy.sh              # 部署生产环境
#   ./deploy.sh dev          # 部署开发环境
#   ./deploy.sh down         # 停止所有服务
#   ./deploy.sh logs         # 查看日志
#   ./deploy.sh rebuild      # 重新构建并部署
#

set -euo pipefail

ENV=${1:-prod}
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    error "Docker 未安装，请先安装 Docker"
    exit 1
fi

# 检查 Docker Compose 是否安装
if ! docker compose version &> /dev/null; then
    error "Docker Compose 未安装，请先安装 Docker Compose"
    exit 1
fi

case "$ENV" in
    prod)
        COMPOSE_FILE="compose.prod.yaml"

        # 检查 secrets 文件
        if [ ! -f "./secrets/jwt_secret.txt" ]; then
            warn "secrets/jwt_secret.txt 不存在，正在生成..."
            mkdir -p secrets
            openssl rand -base64 32 > ./secrets/jwt_secret.txt
            info "JWT 密钥已生成"
        fi

        # 检查 .env 文件
        if [ ! -f ".env" ]; then
            error ".env 文件不存在！请先创建 .env 文件"
            echo "示例:"
            echo "  DB_USER=campus_user"
            echo "  DB_PASSWORD=your_password"
            echo "  DB_NAME=campus_help"
            echo "  MYSQL_ROOT_PASSWORD=your_root_password"
            echo "  JWT_SECRET=your_jwt_secret"
            exit 1
        fi

        # 拉取最新镜像
        info "拉取最新镜像..."
        docker compose -f "$COMPOSE_FILE" pull

        # 启动服务
        info "启动生产环境..."
        docker compose -f "$COMPOSE_FILE" up -d
        ;;

    dev)
        info "启动开发环境..."
        docker compose -f "compose.yaml" up -d
        ;;

    down)
        info "停止所有服务..."
        docker compose -f "compose.yaml" down 2>/dev/null || true
        docker compose -f "compose.prod.yaml" down 2>/dev/null || true
        ;;

    logs)
        local file="compose.yaml"
        [ -f "compose.prod.yaml" ] && [ ! -f "compose.yaml" ] && file="compose.prod.yaml"
        docker compose -f "$file" logs -f
        ;;

    rebuild)
        local file="compose.yaml"
        local tag="dev"
        if [ -n "${2:-}" ] && [ "$2" = "prod" ]; then
            file="compose.prod.yaml"
            tag="prod"
        fi
        info "重新构建并部署 ${tag} 环境..."
        docker compose -f "$file" build --no-cache
        docker compose -f "$file" up -d
        ;;

    *)
        echo "用法: $0 [prod|dev|down|logs|rebuild]"
        echo ""
        echo "命令:"
        echo "  ./deploy.sh           部署生产环境"
        echo "  ./deploy.sh dev       部署开发环境"
        echo "  ./deploy.sh down      停止所有服务"
        echo "  ./deploy.sh logs      查看日志"
        echo "  ./deploy.sh rebuild   重新构建并部署（默认开发环境）"
        echo "  ./deploy.sh rebuild prod  重新构建并部署生产环境"
        exit 1
        ;;
esac

# 等待服务就绪
info "等待服务就绪..."
sleep 5

# 检查后端健康状态
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    info "✅ 后端服务运行正常 (http://localhost:3000)"
else
    warn "后端服务尚未就绪，请运行 'docker compose logs -f' 查看详情"
fi

info "部署完成！"

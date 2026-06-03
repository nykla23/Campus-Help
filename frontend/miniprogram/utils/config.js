// 后端 API 基础地址（开发环境用本地，生产环境部署时需修改）
module.exports = {
  SERVER_HOST: 'http://127.0.0.1:3000',
  get WS_HOST() { return this.SERVER_HOST.replace(/^http/, 'ws'); },
  get API_BASE_URL() { return `${this.SERVER_HOST}/api`; },
};

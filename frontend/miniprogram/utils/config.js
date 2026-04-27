// 后端 API 基础地址（开发环境用本地，生产环境部署时需修改）
module.exports = {
  SERVER_HOST: 'http://127.0.0.1:3000',
  get API_BASE_URL() { return `${this.SERVER_HOST}/api`; },
  
  // 腾讯云 IM SDKAppID（如有）
  IM_SDK_APP_ID: 123456789 // 替换为你的实际 ID
};

const taskModel = require('../models/task');

exports.list = async (req, res) => {

  try {
    // 支持参数：page/limit/status/type等
    let { page = 1, limit = 10, status, type } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    status = status === undefined ? undefined : parseInt(status);
    type = type === undefined ? undefined : parseInt(type);

    // 交给模型层查数据，返回合适的list（包含发布者基础资料）
    const { total, list } = await taskModel.getList({ page, limit, status, type });

    res.json({
      code: 0,
      data: {
        total,
        page,
        limit,
        list
      }
    });
} catch (err) {
  console.error('任务列表出错:', err); // <---关键！ 
  res.status(500).json({ code: 5000, message: '服务器内部错误' });
}
};
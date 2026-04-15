const axios = require('axios');

// 校园互助平台的系统提示词
const SYSTEM_PROMPT = `你是一个友善的校园互助平台智能助手。

关于平台功能：
- 发布任务：用户可以发布取件代送、跑腿代办、学习辅导、其他类型的互助任务
- 接取任务：用户可以浏览并接取其他用户发布的任务
- 任务状态：待接取 → 进行中 → 待确认 → 已完成
- 奖励机制：完成任务可获得金币奖励
- 信用评分：用户的信用评分会影响接单资格

请用友好、简洁的方式回答用户的问题。如果问题与平台无关，请礼貌引导用户咨询平台相关问题。`;

// AI 聊天
exports.chat = async (req, res) => {
  const { message, history = [] } = req.body;

  if (!message || typeof message !== 'string') {
    return res.json({ code: 400, message: '消息内容不能为空' });
  }

  // 检查是否配置了 API Key
  if (!process.env.DEEPSEEK_API_KEY) {
    return res.json({ 
      code: 500, 
      message: 'AI 服务暂不可用，请联系管理员配置' 
    });
  }

  try {
    // 构建消息历史
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history.slice(-10), // 保留最近10条对话
      { role: 'user', content: message }
    ];

    const response = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      {
        model: 'deepseek-chat',
        messages: messages,
        temperature: 0.7,
        max_tokens: 500
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
        },
        timeout: 30000
      }
    );

    const reply = response.data.choices[0]?.message?.content || '抱歉，我暂时无法回答这个问题。';

    res.json({
      code: 200,
      data: {
        reply: reply,
        id: response.data.id
      }
    });

  } catch (error) {
    console.error('AI API 调用失败:', error.message);
    
    if (error.response?.status === 401) {
      return res.json({ code: 500, message: 'AI 服务认证失败，请检查配置' });
    }
    
    res.json({ 
      code: 500, 
      message: 'AI 服务暂时不可用，请稍后再试' 
    });
  }
};

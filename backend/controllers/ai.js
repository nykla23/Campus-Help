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

  const provider = process.env.AI_PROVIDER || 'cloudflare';

  try {
    let reply;

    if (provider === 'groq') {
      reply = await callGroqAPI(message, history);
    } else if (provider === 'deepseek') {
      reply = await callDeepSeekAPI(message, history);
    } else if (provider === 'cloudflare') {
      reply = await callCloudflareAPI(message, history);
    } else {
      reply = await callCloudflareAPI(message, history);
    }

    res.json({
      code: 200,
      data: {
        reply: reply,
        id: Date.now().toString()
      }
    });

  } catch (error) {
    console.error('AI API 调用失败:', error.message);
    res.json({ 
      code: 500, 
      message: error.message || 'AI 服务暂时不可用，请稍后再试' 
    });
  }
};

// Cloudflare Workers AI 调用（直接使用 Workers AI Run 端点）
async function callCloudflareAPI(message, history) {
  const accountId = process.env.CF_ACCOUNT_ID;
  const apiToken = process.env.CF_API_TOKEN;
  const model = process.env.CF_MODEL || '@cf/meta/llama-3.1-8b-instruct';

  if (!accountId || !apiToken) {
    throw new Error('Cloudflare 配置未完整，请在 .env 中设置 CF_ACCOUNT_ID 和 CF_API_TOKEN');
  }

  // 构建 Workers AI 对话消息格式
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.slice(-10),
    { role: 'user', content: message }
  ];

  // 使用 Workers AI 直接运行端点（非 AI Gateway）
  const response = await axios.post(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,
    {
      messages: messages,
      temperature: 0.7,
      max_tokens: 500
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiToken}`
      },
      timeout: 30000
    }
  );

  const result = response.data;
  return result.result?.response || result.choices?.[0]?.message?.content || '抱歉，我暂时无法回答这个问题。';
}

// Groq API 调用 (免费，推荐)
async function callGroqAPI(message, history) {
  const apiKey = process.env.GROQ_API_KEY;
  const model = process.env.GROQ_MODEL || 'llama-3.1-8b-instruct';

  if (!apiKey) {
    throw new Error('Groq API Key 未配置，请在 .env 中设置 GROQ_API_KEY');
  }

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.slice(-10),
    { role: 'user', content: message }
  ];

  const response = await axios.post(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      model: model,
      messages: messages,
      temperature: 0.7,
      max_tokens: 500
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      timeout: 30000
    }
  );
  return response.data.choices[0]?.message?.content || '抱歉，我暂时无法回答这个问题。';
}

// DeepSeek API 调用
async function callDeepSeekAPI(message, history) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const baseUrl = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1';
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

  if (!apiKey) {
    throw new Error('DeepSeek API Key 未配置');
  }

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.slice(-10),
    { role: 'user', content: message }
  ];

  const response = await axios.post(
    `${baseUrl}/chat/completions`,
    {
      model: model,
      messages: messages,
      temperature: 0.7,
      max_tokens: 500
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      timeout: 30000
    }
  );
  return response.data.choices[0]?.message?.content || '抱歉，我暂时无法回答这个问题。';
}

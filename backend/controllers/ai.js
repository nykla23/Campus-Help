const axios = require('axios');

// 校园互助平台的系统提示词（含详细操作流程）
const SYSTEM_PROMPT = `你是一个友善的校园互助平台智能助手。

平台操作指南（请根据以下内容回答用户的问题，如果问题与平台无关请礼貌引导用户咨询平台相关问题）：

【发布任务】
点击底部"发布"标签 → 选择任务类型（取件代送/跑腿代办/学习辅导/其他）→ 填写任务标题、详细描述、悬赏金币数量、地点和截止时间（可选）→ 点击右上角"发布"按钮。发布时会从你的账户冻结相应数量的金币。

【接取任务】
在首页任务列表中浏览 → 可以通过状态标签（全部/待接取/进行中/已完成）和类型标签筛选 → 点击任务卡片查看详情 → 点击"接单"按钮。注意：不能接自己发布的任务。

【任务状态流转】
待接取（可接单、发布者可取消）→ 接单后进入"进行中"（接单者可提交完成、也可放弃任务）→ 提交后进入"待确认"（发布者确认完成）→ 确认后进入"已完成"（金币结算给接单者）。

【取消与放弃】
发布者可在"待接取"状态下取消任务，金币会返还。接单者可在"进行中"状态下放弃任务，任务恢复为待接取。

【金币规则】
发布任务时冻结金币 → 确认完成后划转给接单者 → 取消或放弃任务后退还金币。可以在个人中心的交易记录中查看收支明细。

【聊天功能】
在任务详情页点击"私信"按钮进入聊天页面，可以与对方实时沟通。聊天内容与任务关联。`;

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

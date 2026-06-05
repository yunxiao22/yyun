const express = require('express');
const axios = require('axios');
const crypto = require('crypto');

// 初始化 Express 应用
const app = express();

// 解析 JSON 请求体
app.use(express.json());

// ✅ 添加 CORS 跨域支持（非常重要，否则前端可能无法请求）
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// 百度翻译 API 配置
// ⚠️ 注意：这些变量必须在 Vercel 后台的 Settings -> Environment Variables 中配置
const APP_ID = process.env.BAIDU_APP_ID;
const APP_KEY = process.env.BAIDU_KEY;

// 翻译接口路由
app.post('/translate', async (req, res) => {
  const { q, from = 'auto', to = 'zh' } = req.body;

  // 基础校验
  if (!q) {
    return res.status(400).json({ error: '缺少翻译文本参数 q' });
  }

  if (!APP_ID || !APP_KEY) {
    console.error('❌ 错误：未检测到环境变量 BAIDU_APP_ID 或 BAIDU_KEY');
    return res.status(500).json({ error: '服务器配置错误，请联系管理员' });
  }

  try {
    // 生成签名 (MD5加密)
    // 格式：appid + q + salt + key
    const salt = new Date().getTime();
    const str1 = APP_ID + q + salt + APP_KEY;
    const sign = crypto.createHash('md5').update(str1).digest('hex');

    // 调用百度翻译 API
    const response = await axios.get('https://fanyi-api.baidu.com/api/trans/vip/translate', {
      params: {
        q: q,
        from: from,
        to: to,
        appid: APP_ID,
        salt: salt,
        sign: sign,
      },
    });

    // 返回翻译结果
    const result = response.data.trans_result
      ? response.data.trans_result.map((item) => item.dst).join('\n')
      : '翻译失败';

    res.json({ result });
  } catch (error) {
    console.error('翻译出错:', error.message);
    res.status(500).json({ error: '翻译服务异常，请稍后重试' });
  }
});

// 测试根路由
app.get('/', (req, res) => {
  res.send('🚀 翻译服务后端已成功运行！请访问 /translate 接口。');
});

// ✅ 关键修改：导出 app 供 Vercel Serverless 函数调用
// Vercel 不会执行 app.listen，而是直接导入这个 app
module.exports = app;

const express = require('express');
const axios = require('axios');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

// 简单限流：同一个 IP 每 1 秒最多请求 1 次
const requestMap = new Map();

function simpleRateLimit(req, res, next) {
  const ip = req.ip;
  const now = Date.now();
  const lastTime = requestMap.get(ip) || 0;

  if (now - lastTime < 1000) {
    return res.status(429).json({
      error: '请求过快，请稍后再试'
    });
  }

  requestMap.set(ip, now);
  next();
}

const BAIDU_APP_ID = process.env.BAIDU_APP_ID;
const BAIDU_KEY = process.env.BAIDU_KEY;

if (!BAIDU_APP_ID || !BAIDU_KEY) {
  throw new Error('缺少 BAIDU_APP_ID 或 BAIDU_KEY 环境变量');
}

function getBaiduSign(query, salt) {
  return crypto
    .createHash('md5')
    .update(BAIDU_APP_ID + query + salt + BAIDU_KEY)
    .digest('hex');
}

app.post('/translate', simpleRateLimit, async (req, res) => {
  try {
    const { text, from = 'auto', to = 'zh' } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: '请输入要翻译的文本' });
    }

    const salt = Date.now().toString();
    const sign = getBaiduSign(text, salt);

    const response = await axios.get(
      'https://fanyi-api.baidu.com/api/trans/vip/translate',
      {
        params: {
          q: text,
          from,
          to,
          appid: BAIDU_APP_ID,
          salt,
          sign
        },
        timeout: 10000
      }
    );

    const data = response.data;

    if (data.error_code) {
      return res.status(500).json({
        error: data.error_msg || '百度翻译接口错误'
      });
    }

    const result = data.trans_result
      .map(item => item.dst)
      .join('\n');

    res.json({ result, cached: false });

  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: '翻译失败，请稍后再试' });
  }
});

// 添加这一行，将 Express 应用导出供 Vercel 调用
module.exports = app;

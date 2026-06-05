const express = require('express');
const axios = require('axios');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// 解析 JSON 请求体
app.use(express.json());

// 托管前端静态文件（如果你把 index.html 放在了 public 文件夹下）
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

// 获取环境变量
const BAIDU_APP_ID = process.env.BAIDU_APP_ID;
const BAIDU_KEY = process.env.BAIDU_KEY;

// 启动时检查环境变量（防止忘记配置）
if (!BAIDU_APP_ID || !BAIDU_KEY) {
  console.error('❌ 缺少环境变量！请在 Vercel 后台配置 BAIDU_APP_ID 和 BAIDU_KEY');
  // 注意：在 Vercel 中不建议直接 throw Error 阻断启动，这里改为打印警告
}

// 生成百度翻译签名
function getBaiduSign(query, salt) {
  // 1. 标准化输入：去除首尾空格，确保与 API 接收的参数一致
  const normalizedQuery = query.trim();
  
  // 2. 拼接字符串：appid + q + salt + secret
  const signString = BAIDU_APP_ID + normalizedQuery + salt + BAIDU_KEY;
  
  // 3. 生成 MD5 签名
  return crypto
    .createHash('md5')
    .update(signString)
    .digest('hex');
}

// 翻译接口
app.post('/translate', simpleRateLimit, async (req, res) => {
  try {
    const { text, from = 'auto', to = 'zh' } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: '请输入要翻译的文本' });
    }

    const salt = Date.now().toString();
    // 传入原始 text，getBaiduSign 内部会进行 trim 处理
    const sign = getBaiduSign(text, salt);

    const response = await axios.get(
      'https://fanyi-api.baidu.com/api/trans/vip/translate',
      {
        params: {
          q: text.trim(), // 确保传给百度的参数也是 trim 后的值
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

    // 检查百度 API 是否返回错误
    if (data.error_code) {
      console.error('百度翻译接口报错:', data);
      return res.status(500).json({
        error: data.error_msg || '百度翻译接口错误'
      });
    }

    // 拼接翻译结果
    const result = data.trans_result
      ? data.trans_result.map(item => item.dst).join('\n')
      : '';

    res.json({ result, cached: false });

  } catch (err) {
    console.error('翻译服务异常:', err.message);
    res.status(500).json({ error: '翻译失败，请稍后再试' });
  }
});

// 根路由测试（防止访问首页报 Cannot GET /）
app.get('/', (req, res) => {
  res.send('<h1>🚀 翻译服务后端已成功运行！</h1>');
});

// 导出 app 供 Vercel 调用
module.exports = app;

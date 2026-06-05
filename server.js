const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const path = require('path'); // 引入 path 模块用于处理路径

const app = express();
const PORT = process.env.PORT || 3000;

// --- 中间件配置 ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 托管静态文件 (index.html, style.css, script.js)
// 假设你的前端文件直接放在根目录，或者放在 public 文件夹下
// 如果你的文件都在根目录，建议新建一个 public 文件夹把它们放进去，保持整洁
app.use(express.static(path.join(__dirname, 'public')));
// 同时也兼容根目录下的静态文件（以防万一）
app.use(express.static(__dirname));

// --- 环境变量获取与检查 ---
const BAIDU_APP_ID = process.env.BAIDU_APP_ID;
const BAIDU_KEY = process.env.BAIDU_KEY;

if (!BAIDU_APP_ID || !BAIDU_KEY) {
  console.error('⚠️ 警告：缺少环境变量 BAIDU_APP_ID 或 BAIDU_KEY！');
}

// --- 签名生成函数 ---
function getBaiduSign(query, salt) {
  const str1 = BAIDU_APP_ID + query + salt + BAIDU_KEY;
  return crypto.createHash('md5').update(str1).digest('hex');
}

// --- 简单限流中间件 (保护你的免费额度) ---
const requestMap = new Map();
function simpleRateLimit(req, res, next) {
  const ip = req.ip;
  const now = Date.now();
  const lastTime = requestMap.get(ip) || 0;

  if (now - lastTime < 1000) { // 1秒内只能请求一次
    return res.status(429).json({ error: '请求太快了，请稍后再试' });
  }

  requestMap.set(ip, now);
  next();
}

// --- 翻译核心接口 ---
app.post('/translate', simpleRateLimit, async (req, res) => {
  try {
    const { text, from = 'auto', to = 'zh' } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: '请输入有效的文本内容' });
    }

    const salt = Date.now().toString();
    const sign = getBaiduSign(text.trim(), salt);

    // 发起请求到百度翻译
    const response = await axios.get('https://fanyi-api.baidu.com/api/trans/vip/translate', {
      params: {
        q: text.trim(),
        from: from,
        to: to,
        appid: BAIDU_APP_ID,
        salt: salt,
        sign: sign
      },
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      },
      // 关键：强制指定响应编码为 utf-8，防止中文乱码
      responseEncoding: 'utf-8'
    });

    const data = response.data;

    // 错误处理逻辑
    if (data.error_code) {
      let errorMsg = `百度API错误 (${data.error_code}): ${data.error_msg}`;

      // 针对 517 错误的特别提示
      if (data.error_code === '517') {
        errorMsg += '\n\n💡 排查建议：\n1. 登录百度翻译控制台。\n2. 找到"IP白名单"设置。\n3. 清空所有IP或设置为 0.0.0.0/0 (允许所有IP)。\n4. Vercel 使用动态IP，不设置白名单通常无法访问。';
      }

      console.error(errorMsg);
      return res.status(502).json({ error: errorMsg });
    }

    // 拼接翻译结果
    const result = data.trans_result
      ? data.trans_result.map(item => item.dst).join('\n')
      : '';

    res.json({ result, cached: false });

  } catch (err) {
    console.error('Server Error:', err.message);
    res.status(500).json({ error: '服务器内部错误，请稍后重试' });
  }
});

// --- 路由兜底 (SPA Support) ---
// 如果访问的路径不是 /api 开头，且找不到对应的文件，则返回 index.html
// 这对于前端路由（如 React/Vue 或简单的 JS 跳转）非常重要
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/translate')) {
    return next(); // 如果是 API 请求，跳过，交给 404 处理
  }
  // 尝试发送 index.html
  res.sendFile(path.join(__dirname, 'index.html'), (err) => {
    if (err) {
      // 如果根目录没有 index.html，尝试去 public 找
      res.sendFile(path.join(__dirname, 'public', 'index.html'), (err2) => {
         if(err2) next(); // 都没有，继续走 404
      });
    }
  });
});

module.exports = app;

const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const path = require('path'); // 引入路径模块

const app = express();

// 1. 解析 JSON 请求体 (用于接收翻译请求)
app.use(express.json());

// 2. 添加 CORS 跨域支持 (防止前端报错)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// 3. 【关键修改】手动托管静态文件 (因为文件都在根目录)
// 当用户访问 /style.css 时，发送 style.css 文件
app.get('/style.css', (req, res) => {
  res.sendFile(path.join(__dirname, 'style.css'));
});

// 当用户访问 /script.js 时，发送 script.js 文件
app.get('/script.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'script.js'));
});

// 4. 【关键修改】根路由显示网页
// 当用户访问网站根目录 / 时，发送 index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 5. 百度翻译 API 接口
app.post('/translate', async (req, res) => {
  const { q, from, to } = req.body;

  // ⚠️ 确保你在 Vercel 后台配置了这两个环境变量
  const APP_ID = process.env.BAIDU_APP_ID;
  const KEY = process.env.BAIDU_KEY;

  if (!APP_ID || !KEY) {
    return res.status(500).json({ error: '服务器缺少百度翻译密钥配置' });
  }

  const salt = new Date().getTime();
  const str1 = APP_ID + q + salt + KEY;
  const sign = crypto.createHash('md5').update(str1).digest('hex');

  try {
    const response = await axios.get('https://fanyi-api.baidu.com/api/trans/vip/translate', {
      params: {
        q: q,
        from: from || 'auto',
        to: to || 'zh',
        appid: APP_ID,
        salt: salt,
        sign: sign
      }
    });

    // 返回翻译结果给前端
    res.json(response.data);
  } catch (error) {
    console.error('Translation Error:', error.message);
    res.status(500).json({ error: '翻译请求失败' });
  }
});

// 6. 导出应用给 Vercel (不要写 app.listen)
module.exports = app;

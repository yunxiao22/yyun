const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const path = require('path'); // 1. 引入 path 模块，用于拼接文件路径
const fs = require('fs');     // 2. 引入 fs 模块，用于读取文件

const app = express();

// 解析 JSON 请求体
app.use(express.json());

// ✅ 添加 CORS 跨域支持
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// 3. 修改根路由：直接读取并发送 index.html
app.get('/', (req, res) => {
  // __dirname 代表当前 server.js 所在的目录
  // 我们直接去根目录找 index.html
  const filePath = path.join(__dirname, 'index.html');

  // 检查文件是否存在，防止报错
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send('找不到 index.html 文件，请确保它和 server.js 在同一级目录。');
  }
});

// 百度翻译 API 接口 (保持原样)
app.post('/translate', async (req, res) => {
  try {
    const { q, from, to } = req.body;
    const appid = process.env.BAIDU_APP_ID;
    const key = process.env.BAIDU_KEY;

    if (!appid || !key) {
      return res.status(500).json({ error: '服务器未配置百度翻译密钥' });
    }

    const salt = new Date().getTime();
    const str1 = appid + q + salt + key;
    const sign = crypto.createHash('md5').update(str1).digest('hex');

    const response = await axios.get('https://fanyi-api.baidu.com/api/trans/vip/translate', {
      params: {
        q: q,
        from: from || 'auto',
        to: to || 'auto',
        appid: appid,
        salt: salt,
        sign: sign
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '翻译请求失败' });
  }
});

// 导出 app 供 Vercel 使用
module.exports = app;

const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const app = express();

// 1. 解析 JSON 请求体
app.use(express.json());

// 2. 添加 CORS 跨域支持 (防止浏览器拦截)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// 3. 【关键】托管静态文件 (解决 index.html, style.css 等文件的加载)
// 这样你就不需要 public 文件夹了，所有文件都在根目录即可
app.use(express.static(path.join(__dirname)));

// 4. 【关键】定义翻译接口 (解决 404 问题)
// 假设你的前端请求的是 /translate
app.post('/translate', async (req, res) => {
  try {
    const { q, from, to } = req.body; // 接收前端发来的文字

    // 检查环境变量是否存在
    const appId = process.env.BAIDU_APP_ID;
    const key = process.env.BAIDU_KEY;

    if (!appId || !key) {
      console.error("环境变量未找到！");
      return res.status(500).json({ error: "服务器配置错误：缺少密钥" });
    }

    // 百度翻译 API 逻辑
    const salt = Date.now();
    const sign = crypto.createHash('md5').update(appId + q + salt + key).digest('hex');

    const response = await axios.get('https://fanyi-api.baidu.com/api/trans/vip/translate', {
      params: {
        q: q,
        from: from || 'auto',
        to: to || 'zh',
        appid: appId,
        salt: salt,
        sign: sign
      }
    });

    // 返回翻译结果给前端
    res.json(response.data);

  } catch (error) {
    console.error("翻译出错:", error.message);
    res.status(500).json({ error: "翻译服务繁忙，请稍后再试" });
  }
});

// 5. 兜底路由：确保访问根目录时返回 index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 启动服务器 (Vercel 会接管端口，这里只是本地测试用)
const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;

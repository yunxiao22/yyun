const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs'); // 新增：用于读取文件

const app = express();
app.use(express.json());

// --- 1. 静态文件服务 (解决 CSS/JS 404 问题) ---
// 当访问根目录 / 时，发送 index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 当访问 /style.css 时，发送 style.css
app.get('/style.css', (req, res) => {
    res.sendFile(path.join(__dirname, 'style.css'));
});

// 当访问 /script.js 时，发送 script.js
app.get('/script.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'script.js'));
});

// --- 2. 翻译接口 (解决翻译失败问题) ---
app.post('/translate', async (req, res) => {
    const { text, from, to } = req.body;

    if (!text) {
        return res.status(400).json({ error: '请输入要翻译的内容' });
    }

    // 从环境变量获取密钥 (你在 Vercel 设置里配好的)
    const appid = process.env.BAIDU_APPID;
    const key = process.env.BAIDU_KEY;

    if (!appid || !key) {
        console.error('错误：未配置百度翻译密钥');
        return res.status(500).json({ error: '服务器配置错误' });
    }

    try {
        // 百度翻译签名算法
        const salt = new Date().getTime();
        const str1 = appid + text + salt + key;
        const sign = crypto.createHash('md5').update(str1).digest('hex');

        // 调用百度 API
        const response = await axios.get('https://fanyi-api.baidu.com/api/trans/vip/translate', {
            params: {
                q: text,
                from: from || 'auto',
                to: to || 'auto',
                appid: appid,
                salt: salt,
                sign: sign
            }
        });

        const data = response.data;

        // 检查百度 API 是否报错
        if (data.error_code) {
            return res.status(502).json({ error: data.error_msg });
        }

        // 拼接翻译结果
        const result = data.trans_result.map(item => item.dst).join('\n');

        res.json({ result: result });

    } catch (error) {
        console.error('翻译请求失败:', error.message);
        res.status(500).json({ error: '翻译服务繁忙，请稍后再试' });
    }
});

// 启动服务 (适配 Vercel 和本地测试)
const PORT = process.env.PORT || 3000;
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;

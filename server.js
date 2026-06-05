const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// 1. 解析 JSON 数据
app.use(express.json());

// 2. 托管静态文件 (html, css, js)
app.use(express.static(path.join(__dirname)));

// 3. 核心翻译接口
app.post('/translate', async (req, res) => {
    console.log('收到翻译请求:', req.body); 

    // 接收前端传来的 text, from, to
    const { text, from, to } = req.body;

    if (!text) {
        return res.status(400).json({ error: '缺少翻译文本' });
    }

    // --- 百度翻译 API 配置 ---
    const appid = process.env.BAIDU_APPID || '你的APPID';      
    const key = process.env.BAIDU_KEY || '你的密钥';         

    const salt = Date.now();
    const sign = crypto.createHash('md5').update(appid + text + salt + key).digest('hex');

    try {
        const response = await axios.get('https://fanyi-api.baidu.com/api/trans/vip/translate', {
            params: {
                q: text,
                from: from || 'auto',
                to: to || 'zh',
                appid: appid,
                salt: salt,
                sign: sign
            }
        });

        // 检查百度API是否返回了错误码
        if (response.data.error_code) {
            console.error('Baidu API Error:', response.data);
            return res.status(500).json({ 
                error: `翻译服务出错: ${response.data.error_msg} (Code: ${response.data.error_code})` 
            });
        }

        // 【关键修复】：提取百度API的翻译结果，并包装成前端 script.js 期望的格式
        // 前端期望: { result: "译文内容", cached: false }
        const translatedText = response.data.trans_result 
            ? response.data.trans_result[0].dst 
            : '无翻译结果';

        res.json({
            result: translatedText,
            cached: false
        });

    } catch (error) {
        console.error('翻译出错:', error.message);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 4. 捕获所有其他 GET 请求，返回 index.html (防止刷新页面 404)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html')); 
});

app.listen(port, () => {
    console.log(`服务器运行在端口 ${port}`);
});

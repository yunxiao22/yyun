const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const path = require('path');

const app = express();

// 1. 托管静态文件 (index.html, script.js, style.css)
app.use(express.static(path.join(__dirname, 'public')));

// 2. 解析 JSON 请求体
app.use(express.json());

// 3. 定义翻译接口路由
app.post('/translate', async (req, res) => {
    try {
        const { text } = req.body;
        
        if (!text) {
            return res.status(400).json({ error: '请输入要翻译的内容' });
        }

        // 这里假设你使用百度翻译API，你需要替换成你自己的APP_ID和SECRET_KEY
        const APP_ID = 'YOUR_BAIDU_APP_ID';
        const SECRET_KEY = 'YOUR_BAIDU_SECRET_KEY';
        
        // 生成签名
        const salt = new Date().getTime();
        const str1 = APP_ID + text + salt + SECRET_KEY;
        const sign = crypto.createHash('md5').update(str1).digest('hex');

        // 调用百度翻译API
        const response = await axios.get('https://fanyi-api.baidu.com/api/trans/vip/translate', {
            params: {
                q: text,
                from: 'auto',
                to: 'en',
                appid: APP_ID,
                salt: salt,
                sign: sign
            }
        });

        // 返回翻译结果
        res.json({ result: response.data.trans_result[0].dst });

    } catch (error) {
        console.error('翻译失败:', error);
        res.status(500).json({ error: '翻译服务暂时不可用' });
    }
});

// 4. 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

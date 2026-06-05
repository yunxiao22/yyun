const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const path = require('path');

const app = express();

// 1. 托管静态文件 (index.html, script.js, style.css)
app.use(express.static(path.join(__dirname, 'public')));

// 2. 解析 JSON 请求体
app.use(express.json());

// 3. 定义翻译接口 (关键修复点)
app.post('/translate', async (req, res) => {
    const { q } = req.body;
    
    if (!q) {
        return res.status(400).json({ error: '缺少待翻译文本' });
    }

    try {
        // 百度翻译 API 配置
        const appid = process.env.BAIDU_APP_ID || '你的APPID'; 
        const key = process.env.BAIDU_KEY || '你的密钥';
        
        // 生成签名
        const salt = Date.now().toString();
        const str = appid + q + salt + key;
        const sign = crypto.createHash('md5').update(str).digest('hex');

        // 调用百度翻译
        const result = await axios.get('https://fanyi-api.baidu.com/api/trans/vip/translate', {
            params: {
                q: q,
                from: 'auto',
                to: 'zh',
                appid: appid,
                salt: salt,
                sign: sign
            }
        });

        // 返回结果给前端
        if (result.data.trans_result && result.data.trans_result.length > 0) {
            res.json({ translatedText: result.data.trans_result[0].dst });
        } else {
            res.status(500).json({ error: '翻译失败或无结果' });
        }

    } catch (error) {
        console.error("Translation Error:", error.message);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 启动服务
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

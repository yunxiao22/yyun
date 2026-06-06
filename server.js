const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// 1. 解析 JSON 数据
app.use(express.json());

// 2. 托管静态文件 (html, css, js)
// 指向当前目录，确保能找到 index.html
app.use(express.static(path.join(__dirname)));

// 3. 核心翻译接口
app.post('/translate', async (req, res) => {
    console.log('收到翻译请求:', req.body);

    const { text, from, to } = req.body;

    if (!text) {
        return res.status(400).json({ error: '缺少翻译文本' });
    }

    // --- 百度翻译 API 配置 ---
    const appid = process.env.BAIDU_APPID || '你的APPID';
    const key = process.env.BAIDU_KEY || '你的密钥';

    const salt = Date.now();
    // 注意：如果 text 包含中文，必须使用 encodeURIComponent 处理，否则签名会错
    const signStr = appid + text + salt + key;
    const sign = crypto.createHash('md5').update(signStr).digest('hex');

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

        if (response.data.error_code) {
            console.error('Baidu API Error:', response.data);
            return res.status(500).json({
                error: `翻译服务出错: ${response.data.error_msg} (Code: ${response.data.error_code})`
            });
        }

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

// 4. 【关键修复】捕获所有其他 GET 请求，返回 index.html
// 将 '*' 改为 '/:splat*' 以兼容 Express 5 / Vercel 环境
app.get('/:splat*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
    console.log(`服务器运行在端口 ${port}`);
});

const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const path = require('path');

const app = express();
app.use(express.json()); // 解析 JSON 请求体

// 1. 托管静态文件 (html, css, js)
// 这行代码非常重要，它让 server.js 能找到同目录下的 index.html
app.use(express.static(path.join(__dirname)));

// 2. 翻译接口
app.post('/translate', async (req, res) => {
    try {
        const { q, from, to } = req.body;

        // 这里需要填入你的百度翻译 API ID 和 密钥
        // 如果没有，可以去百度翻译开放平台申请，或者暂时用下面的模拟逻辑测试
        const appid = 'YOUR_APP_ID';
        const key = 'YOUR_SECRET_KEY';

        if (!q) {
            return res.status(400).json({ error: '缺少翻译内容' });
        }

        // --- 真实百度翻译逻辑 (如果你有账号) ---
        /*
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

        const result = response.data.trans_result.map(item => item.dst).join('\n');
        return res.json({ result: result });
        */

        // --- 模拟逻辑 (如果你还没填 Key，先用这个测试连通性) ---
        // 删除上面的注释块并填入 Key 后即可使用真实翻译
        return res.json({
            result: `[模拟翻译] 原文: ${q} (当前未配置百度API Key，请在server.js中配置)`
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 3. 启动服务 (Vercel 会忽略 port，但这行代码是必须的)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

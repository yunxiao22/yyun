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
    // 请确保在 Vercel 的环境变量设置中添加了 BAIDU_APPID 和 BAIDU_KEY
    const appid = process.env.BAIDU_APPID || '你的APPID';
    const key = process.env.BAIDU_KEY || '你的密钥';

    const salt = Date.now();
    // 【关键修复】：签名拼接时，如果包含中文，建议进行编码处理以防乱码导致验签失败
    const str = appid + text + salt + key;
    const sign = crypto.createHash('md5').update(str).digest('hex');

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

        // 提取翻译结果
        const translatedText = response.data.trans_result
            ? response.data.trans_result[0].dst
            : '无翻译结果';

        res.json({
            result: translatedText,
            cached: false
        });

    } catch (error) {
        console.error('服务器请求百度API失败:', error.message);
        res.status(500).json({ error: '服务器内部错误，请稍后重试' });
    }
});

// 4. 捕获所有其他 GET 请求，返回 index.html (防止刷新页面 404)
// Express 4.x 支持这种写法
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
    console.log(`服务器运行在端口 ${port}`);
});

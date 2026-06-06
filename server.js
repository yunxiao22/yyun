const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const path = require('path');

const app = express();
app.use(express.json());

// 从环境变量获取密钥
const BAIDU_APPID = process.env.BAIDU_APPID;
const BAIDU_KEY = process.env.BAIDU_KEY;

// 静态文件服务 (Vercel 会自动处理，但本地运行需要这行)
app.use(express.static(path.join(__dirname)));

// 首页路由
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 翻译接口
app.post('/translate', async (req, res) => {
    const { q, from, to } = req.body;

    if (!q) {
        return res.status(400).json({ error: '缺少翻译内容' });
    }

    // 如果没有配置密钥，返回错误提示
    if (!BAIDU_APPID || !BAIDU_KEY) {
        console.error("未检测到环境变量 BAIDU_APPID 或 BAIDU_KEY");
        return res.status(500).json({ error: '服务器配置错误：缺少百度翻译密钥' });
    }

    const salt = new Date().getTime();
    // 拼接签名字符串：appid + q + salt + 密钥
    const str1 = BAIDU_APPID + q + salt + BAIDU_KEY;
    // 计算 MD5
    const sign = crypto.createHash('md5').update(str1).digest('hex');

    try {
        const response = await axios.get('https://fanyi-api.baidu.com/api/trans/vip/translate', {
            params: {
                q: q,
                from: from || 'auto',
                to: to || 'auto',
                appid: BAIDU_APPID,
                salt: salt,
                sign: sign
            }
        });

        // 百度 API 返回格式处理
        if (response.data.error_code) {
            return res.status(502).json({
                error: `百度API错误: ${response.data.error_msg} (${response.data.error_code})`
            });
        }

        // 提取翻译结果数组并拼接成字符串
        const resultText = response.data.trans_result.map(item => item.dst).join('\n');
        res.json({ result: resultText });

    } catch (error) {
        console.error('Translation Error:', error.message);
        res.status(500).json({ error: '翻译请求失败，请稍后重试' });
    }
});

// 兼容 Vercel 的导出方式
module.exports = app;

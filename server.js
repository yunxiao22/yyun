const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const path = require('path');

const app = express();

// 解析 JSON 请求体
app.use(express.json());

// 核心翻译接口
app.post('/api/translate', async (req, res) => {
    try {
        const { q, from, to } = req.body; // 前端传来的文本

        if (!q) {
            return res.status(400).json({ error: '请输入要翻译的内容' });
        }

        // --- 百度翻译配置 ---
        // ⚠️ 重要：请在 Vercel 项目设置 -> Settings -> Environment Variables 中添加这两个变量
        const appid = process.env.BAIDU_APPID || '你的APPID';
        const key = process.env.BAIDU_KEY || '你的密钥';

        const salt = Date.now().toString();
        // 拼接签名字符串：appid + q + salt + key
        const str1 = appid + q + salt + key;
        // 生成 MD5 签名
        const sign = crypto.createHash('md5').update(str1).digest('hex');

        // 调用百度翻译 API
        const response = await axios.get('https://fanyi-api.baidu.com/api/trans/vip/translate', {
            params: {
                q: q,
                from: from || 'auto',
                to: to || 'zh',
                appid: appid,
                salt: salt,
                sign: sign
            }
        });

        // 返回翻译结果给前端
        res.json(response.data);

    } catch (error) {
        console.error('翻译出错:', error.message);
        res.status(500).json({ error: '服务器翻译失败' });
    }
});

// 启动服务 (Vercel 会接管端口，这里是为了本地测试方便)
const PORT = process.env.PORT || 3000;
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app; // 导出 app 供 Vercel 使用

// script.js - 英语 ↔ 中文翻译器升级版
// 兼容当前 index.html 与 style.css
// 新增：缓存提示、Ctrl/Cmd+Enter、请求防重复、改进复制与朗读体验

const inputText = document.getElementById('inputText');
const outputText = document.getElementById('outputText');
const direction = document.getElementById('direction');
const directionTip = document.getElementById('directionTip');

const translateBtn = document.getElementById('translateBtn');
const clearBtn = document.getElementById('clearBtn');
const swapBtn = document.getElementById('swapBtn');
const copyBtn = document.getElementById('copyBtn');
const copyBothBtn = document.getElementById('copyBothBtn');
const speakInputBtn = document.getElementById('speakInputBtn');
const speakOutputBtn = document.getElementById('speakOutputBtn');
const favoriteBtn = document.getElementById('favoriteBtn');
const themeBtn = document.getElementById('themeBtn');

const loading = document.getElementById('loading');
const message = document.getElementById('message');
const charCount = document.getElementById('charCount');
const wordCount = document.getElementById('wordCount');

const wordCard = document.getElementById('wordCard');
const wordInfo = document.getElementById('wordInfo');

const historyList = document.getElementById('historyList');
const favoriteList = document.getElementById('favoriteList');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const clearFavoriteBtn = document.getElementById('clearFavoriteBtn');

const HISTORY_KEY = 'translator_history';
const FAVORITE_KEY = 'translator_favorite';
const THEME_KEY = 'translator_theme';

let lastTranslation = null;
let translating = false;
let messageTimer = null;

// ==================== 基础工具 ====================

function showMessage(text) {
    clearTimeout(messageTimer);
    message.textContent = text;

    messageTimer = setTimeout(() => {
        message.textContent = '';
    }, 2600);
}

function hasChinese(text) {
    return /[\u3400-\u9fff]/.test(text);
}

function countEnglishWords(text) {
    const words = text.match(/[A-Za-z]+(?:[-'][A-Za-z]+)?/g);
    return words ? words.length : 0;
}

function detectDirection(text) {
    return hasChinese(text) ? 'zh-en' : 'en-zh';
}

function getDirectionLabel(mode) {
    if (mode === 'zh-en') return '中文 → 英文';
    if (mode === 'en-zh') return '英文 → 中文';
    return '自动识别';
}

function getFromTo() {
    let mode = direction.value;

    if (mode === 'auto') {
        mode = detectDirection(inputText.value.trim());
    }

    if (mode === 'zh-en') {
        return {
            from: 'zh',
            to: 'en',
            mode,
            label: '中文 → 英文'
        };
    }

    return {
        from: 'en',
        to: 'zh',
        mode,
        label: '英文 → 中文'
    };
}

function updateStats() {
    const text = inputText.value;

    charCount.textContent = `字符：${text.length}`;
    wordCount.textContent = `英文单词：${countEnglishWords(text)}`;

    updateDirectionTip();
}

function updateDirectionTip() {
    const text = inputText.value.trim();

    if (direction.value === 'auto') {
        if (!text) {
            directionTip.textContent = '当前：自动识别';
        } else {
            directionTip.textContent =
                `当前识别：${getDirectionLabel(detectDirection(text))}`;
        }
    } else {
        directionTip.textContent =
            `当前：${getDirectionLabel(direction.value)}`;
    }
}

function autoResize(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
}

function loadArray(key) {
    try {
        return JSON.parse(localStorage.getItem(key)) || [];
    } catch {
        return [];
    }
}

function saveArray(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function formatTime(time) {
    const date = new Date(time);

    return date.toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// ==================== 历史与收藏 ====================

function addHistory(item) {
    let list = loadArray(HISTORY_KEY);

    list = list.filter(old => {
        return !(old.source === item.source && old.result === item.result);
    });

    list.unshift(item);

    if (list.length > 20) {
        list = list.slice(0, 20);
    }

    saveArray(HISTORY_KEY, list);
    renderHistory();
}

function addFavorite(item) {
    if (!item) {
        showMessage('请先翻译内容');
        return;
    }

    let list = loadArray(FAVORITE_KEY);

    const exists = list.some(old => {
        return old.source === item.source && old.result === item.result;
    });

    if (exists) {
        showMessage('已经收藏过了');
        return;
    }

    list.unshift(item);

    if (list.length > 30) {
        list = list.slice(0, 30);
    }

    saveArray(FAVORITE_KEY, list);
    renderFavorite();
    showMessage('已收藏');
}

function createRecordElement(item, type) {
    const record = document.createElement('div');
    record.className = 'record';

    const main = document.createElement('div');
    main.className = 'record-main';

    const source = document.createElement('p');
    source.className = 'record-source';
    source.textContent = item.source;

    const result = document.createElement('p');
    result.className = 'record-result';
    result.textContent = item.result;

    const meta = document.createElement('p');
    meta.className = 'record-meta';

    const cacheText = item.cached ? ' · 缓存结果' : '';
    meta.textContent =
        `${item.label} · ${formatTime(item.time)}${cacheText}`;

    main.appendChild(source);
    main.appendChild(result);
    main.appendChild(meta);

    const actions = document.createElement('div');
    actions.className = 'record-actions';

    const useBtn = document.createElement('button');
    useBtn.type = 'button';
    useBtn.textContent = '使用';

    useBtn.addEventListener('click', () => {
        inputText.value = item.source;
        outputText.value = item.result;

        direction.value = item.mode || 'auto';
        lastTranslation = item;

        updateStats();
        autoResize(inputText);
        autoResize(outputText);
        showWordCard(item.source, item.result, item.mode);

        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });

        showMessage('已加载此条记录');
    });

    actions.appendChild(useBtn);

    if (type === 'history') {
        const favBtn = document.createElement('button');
        favBtn.type = 'button';
        favBtn.textContent = '收藏';

        favBtn.addEventListener('click', () => {
            addFavorite(item);
        });

        actions.appendChild(favBtn);
    }

    record.appendChild(main);
    record.appendChild(actions);

    return record;
}

function renderHistory() {
    const list = loadArray(HISTORY_KEY);
    historyList.innerHTML = '';

    if (list.length === 0) {
        historyList.innerHTML = '<p class="empty">暂无翻译历史</p>';
        return;
    }

    list.forEach(item => {
        historyList.appendChild(createRecordElement(item, 'history'));
    });
}

function renderFavorite() {
    const list = loadArray(FAVORITE_KEY);
    favoriteList.innerHTML = '';

    if (list.length === 0) {
        favoriteList.innerHTML = '<p class="empty">暂无收藏内容</p>';
        return;
    }

    list.forEach(item => {
        favoriteList.appendChild(createRecordElement(item, 'favorite'));
    });
}

// ==================== 复制与朗读 ====================

async function copyText(text) {
    if (!text.trim()) {
        showMessage('没有可复制的内容');
        return;
    }

    try {
        await navigator.clipboard.writeText(text);
        showMessage('已复制到剪贴板');
    } catch {
        const temp = document.createElement('textarea');
        temp.value = text;
        temp.style.position = 'fixed';
        temp.style.opacity = '0';

        document.body.appendChild(temp);
        temp.select();

        try {
            document.execCommand('copy');
            showMessage('已复制');
        } catch {
            showMessage('复制失败，请手动复制');
        }

        document.body.removeChild(temp);
    }
}

function speak(text, lang) {
    if (!text.trim()) {
        showMessage('没有可朗读的内容');
        return;
    }

    if (!window.speechSynthesis) {
        showMessage('当前浏览器不支持朗读');
        return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    utterance.lang = lang || (hasChinese(text) ? 'zh-CN' : 'en-US');
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onerror = () => {
        showMessage('朗读失败');
    };

    window.speechSynthesis.speak(utterance);
}

// ==================== 单词卡片 ====================

function guessPartOfSpeech(word) {
    const lower = word.toLowerCase();

    if (lower.endsWith('ly')) {
        return '副词可能性较高';
    }

    if (
        lower.endsWith('tion') ||
        lower.endsWith('ness') ||
        lower.endsWith('ment')
    ) {
        return '名词可能性较高';
    }

    if (lower.endsWith('ing') || lower.endsWith('ed')) {
        return '动词或形容词可能性较高';
    }

    if (
        lower.endsWith('ful') ||
        lower.endsWith('able') ||
        lower.endsWith('ous')
    ) {
        return '形容词可能性较高';
    }

    return '需要结合句子判断';
}

function showWordCard(source, result, mode) {
    const word = source.trim();

    if (
        mode !== 'en-zh' ||
        !/^[A-Za-z][A-Za-z'-]*$/.test(word)
    ) {
        wordCard.classList.add('hidden');
        wordInfo.textContent = '';
        return;
    }

    wordCard.classList.remove('hidden');

    wordInfo.textContent =
`英文单词：${word}
中文释义：${result}
词性提示：${guessPartOfSpeech(word)}
练习例句：I want to learn the word "${word}".
参考译文：我想学习单词“${word}”。

说明：这是基础单词卡片，后续还可以接入词典接口，显示音标、标准词性和更多例句。`;
}

// ==================== 翻译请求 ====================

async function translateText() {
    if (translating) {
        return;
    }

    const text = inputText.value.trim();

    if (!text) {
        showMessage('请输入要翻译的内容');
        inputText.focus();
        return;
    }

    const langInfo = getFromTo();

    try {
        translating = true;
        translateBtn.disabled = true;
        translateBtn.textContent = '翻译中...';

        loading.classList.remove('hidden');
        outputText.value = '';
        wordCard.classList.add('hidden');
        wordInfo.textContent = '';

        const response = await fetch('/translate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text,
                from: langInfo.from,
                to: langInfo.to
            })
        });

        let data;

        try {
            data = await response.json();
        } catch {
            throw new Error('服务器返回格式错误');
        }

        if (!response.ok) {
            outputText.value = data.error || '翻译失败';
            autoResize(outputText);
            showMessage(data.error || '翻译失败，请稍后再试');
            return;
        }

        const result = data.result || '没有返回翻译结果';

        outputText.value = result;
        autoResize(outputText);

        lastTranslation = {
            source: text,
            result,
            from: langInfo.from,
            to: langInfo.to,
            mode: langInfo.mode,
            label: langInfo.label,
            cached: Boolean(data.cached),
            time: Date.now()
        };

        addHistory(lastTranslation);
        showWordCard(text, result, langInfo.mode);

        if (data.cached) {
            showMessage('翻译完成 · 来自缓存');
        } else {
            showMessage('翻译完成');
        }

    } catch (error) {
        console.error(error);

        outputText.value = '请求失败，请检查服务器是否启动';
        autoResize(outputText);

        showMessage('请求失败');
    } finally {
        translating = false;
        translateBtn.disabled = false;
        translateBtn.textContent = '翻译';
        loading.classList.add('hidden');
    }
}

// ==================== 事件绑定 ====================

translateBtn.addEventListener('click', translateText);

inputText.addEventListener('input', () => {
    updateStats();
    autoResize(inputText);
});

inputText.addEventListener('keydown', event => {
    const isShortcut =
        (event.ctrlKey || event.metaKey) &&
        event.key === 'Enter';

    if (isShortcut) {
        event.preventDefault();
        translateText();
    }
});

direction.addEventListener('change', () => {
    updateDirectionTip();
});

clearBtn.addEventListener('click', () => {
    inputText.value = '';
    outputText.value = '';

    lastTranslation = null;

    wordCard.classList.add('hidden');
    wordInfo.textContent = '';
    message.textContent = '';

    updateStats();
    autoResize(inputText);
    autoResize(outputText);

    inputText.focus();
});

swapBtn.addEventListener('click', () => {
    const currentMode = direction.value === 'auto'
        ? detectDirection(inputText.value || outputText.value || '')
        : direction.value;

    direction.value =
        currentMode === 'en-zh' ? 'zh-en' : 'en-zh';

    if (outputText.value.trim()) {
        const oldInput = inputText.value;

        inputText.value = outputText.value;
        outputText.value = oldInput;
    }

    lastTranslation = null;

    updateStats();
    updateDirectionTip();
    autoResize(inputText);
    autoResize(outputText);

    wordCard.classList.add('hidden');
    wordInfo.textContent = '';

    showMessage('已交换翻译方向');
});

copyBtn.addEventListener('click', () => {
    copyText(outputText.value);
});

copyBothBtn.addEventListener('click', () => {
    const source = inputText.value.trim();
    const result = outputText.value.trim();

    if (!source || !result) {
        showMessage('请先完成翻译');
        return;
    }

    copyText(`原文：${source}\n译文：${result}`);
});

speakInputBtn.addEventListener('click', () => {
    const lang = getFromTo().from === 'zh' ? 'zh-CN' : 'en-US';
    speak(inputText.value, lang);
});

speakOutputBtn.addEventListener('click', () => {
    const lang = getFromTo().to === 'zh' ? 'zh-CN' : 'en-US';
    speak(outputText.value, lang);
});

favoriteBtn.addEventListener('click', () => {
    addFavorite(lastTranslation);
});

clearHistoryBtn.addEventListener('click', () => {
    localStorage.removeItem(HISTORY_KEY);
    renderHistory();
    showMessage('历史记录已清空');
});

clearFavoriteBtn.addEventListener('click', () => {
    localStorage.removeItem(FAVORITE_KEY);
    renderFavorite();
    showMessage('收藏已清空');
});

themeBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark');

    const isDark = document.body.classList.contains('dark');

    localStorage.setItem(
        THEME_KEY,
        isDark ? 'dark' : 'light'
    );

    themeBtn.textContent = isDark ? '☀️' : '🌙';
});

// ==================== 初始化 ====================

function initTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY);

    if (savedTheme === 'dark') {
        document.body.classList.add('dark');
        themeBtn.textContent = '☀️';
    } else {
        document.body.classList.remove('dark');
        themeBtn.textContent = '🌙';
    }
}

function init() {
    initTheme();
    updateStats();
    renderHistory();
    renderFavorite();
    autoResize(inputText);
    autoResize(outputText);
}

init();
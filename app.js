// --- DOM Elements ---
const dom = {
    generateBtn: document.getElementById('generateBtn'),
    btnText: document.getElementById('btn-text'),
    loader: document.getElementById('loader'),
    promptInput: document.getElementById('prompt'),
    chatHistoryDiv: document.getElementById('chatHistory'),
    messageBox: document.getElementById('messageBox'),
    messageType: document.getElementById('messageType'),
    messageText: document.getElementById('messageText'),
    addTabBtn: document.getElementById('add-tab-btn'),
    tabsList: document.getElementById('tabs-list'),
    fileUploadInput: document.getElementById('fileUpload'),
    fileAttachmentContainer: document.getElementById('file-attachment-container'),
    themeToggleBtn: document.getElementById('theme-toggle'),
    themeIcons: { dark: document.getElementById('theme-icon-dark'), light: document.getElementById('theme-icon-light') },
    settingsBtn: document.getElementById('settings-btn'),
    settingsModal: document.getElementById('settings-modal'),
    settingsOverlay: document.getElementById('settings-overlay'),
    closeSettingsBtn: document.getElementById('close-settings-btn'),
    workbenchModeBtn: document.getElementById('workbench-mode-btn'),
    workbenchModeValue: document.getElementById('workbench-mode-value'),
    workbenchModePopup: document.getElementById('workbench-mode-popup'),
    aiModelBtn: document.getElementById('ai-model-btn'),
    aiModelValue: document.getElementById('ai-model-value'),
    aiModelPopup: document.getElementById('ai-model-popup'),
    openrouterKeySection: document.getElementById('openrouter-key-section'),
    openrouterApiKeyInput: document.getElementById('openrouter-api-key'),
};

// --- State & Config ---
let state = {
    sessions: {},
    activeSessionId: null,
    editingMessageId: null,
    abortController: null,
    attachedFile: null,
    workbenchMode: 'js',
    systemPrompt: '',
    activeApi: 'google',
    uiTheme: 'theme-minimal-light',
    themes: ['theme-minimal-light', 'theme-pro-coder'],
    openPopup: null,
    currentUser: null, // To store the logged-in user object
    db: null, // To store the firestore instance
};

const MAX_HISTORY_LENGTH = 30;

// This function is now called from backend.js after successful login
function initializeApp(user, firestore) {
    state.currentUser = user;
    state.db = firestore;

    applyTheme(localStorage.getItem('uiTheme_v4') || 'theme-minimal-light');
    loadSettings();
    loadSessions();
    if (Object.keys(state.sessions).length === 0) {
        createNewSession();
    } else {
        const lastActiveId = localStorage.getItem(`activeSessionId_v4_${state.currentUser.uid}`);
        switchSession(state.sessions[lastActiveId] ? lastActiveId : Object.keys(state.sessions)[0]);
    }
    
    // Setup event listeners for the main app
    setupEventListeners();
}

// --- System Prompt Generation ---
function updateSystemPrompt() {
    let contextEl, template;
    switch(state.workbenchMode) {
        case 'js':
            contextEl = document.getElementById('userContextJs');
            template = JS_SYSTEM_PROMPT_TEMPLATE;
            break;
        case 'js-plus':
            contextEl = document.getElementById('userContextJsPlus');
            template = JS_PLUS_SYSTEM_PROMPT_TEMPLATE;
            break;
        case 'jsonui':
            contextEl = document.getElementById('userContextJsonUi');
            template = JSONUI_SYSTEM_PROMPT_TEMPLATE;
            break;
    }
    state.systemPrompt = template.replace('{CONTEXT}', contextEl ? contextEl.textContent : '');
}

// --- File Attachment Management ---
function renderFileAttachment() {
    dom.fileAttachmentContainer.innerHTML = '';
    if (state.attachedFile) {
        const pill = document.createElement('div');
        pill.className = 'file-pill';
        pill.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-[var(--secondary-text)]" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd" /></svg><span class="file-pill-name">${state.attachedFile.name}</span><button class="file-pill-remove-btn" title="移除文件">&times;</button>`;
        pill.querySelector('.file-pill-remove-btn').addEventListener('click', removeFileAttachment);
        dom.fileAttachmentContainer.appendChild(pill);
    }
}
function removeFileAttachment() {
    state.attachedFile = null;
    dom.fileUploadInput.value = '';
    renderFileAttachment();
}

// --- Settings Management ---
function togglePopup(popupElement) {
    if (state.openPopup && state.openPopup !== popupElement) {
        state.openPopup.classList.remove('is-active');
    }
    popupElement.classList.toggle('is-active');
    state.openPopup = popupElement.classList.contains('is-active') ? popupElement : null;
}

function openSettings() { dom.settingsModal.classList.add('is-open'); }
function closeSettings() { 
    if(state.openPopup) {
        state.openPopup.classList.remove('is-active');
        state.openPopup = null;
    }
    dom.settingsModal.classList.remove('is-open'); 
}

function saveAndApplySettings() {
    const selectedMode = document.querySelector('input[name="workbench-mode"]:checked').value;
    if (state.workbenchMode !== selectedMode) {
        state.workbenchMode = selectedMode;
        updateSystemPrompt();
        showMessage('提示', `已切换到 ${WORKBENCH_MODES[selectedMode]} 模式`, 'info');
    }
    localStorage.setItem('workbenchMode_v3', state.workbenchMode);

    const selectedApiModel = document.querySelector('input[name="ai-model"]:checked').value;
    state.activeApi = selectedApiModel;
    localStorage.setItem('activeApi_v3', selectedApiModel);
    
    const openrouterKey = dom.openrouterApiKeyInput.value.trim();
    localStorage.setItem('openrouterApiKey_v3', openrouterKey);
    apiConfigs.openrouter.key = openrouterKey;
    
    updateSettingsUI();
}

function loadSettings() {
    state.workbenchMode = localStorage.getItem('workbenchMode_v3') || 'js';
    const modeRadio = document.getElementById(`mode-${state.workbenchMode}`);
    if (modeRadio) modeRadio.checked = true;

    state.activeApi = localStorage.getItem('activeApi_v3') || 'google';
    const apiRadio = document.getElementById(`model-${state.activeApi}`);
    if (apiRadio) apiRadio.checked = true;

    const savedOpenrouterKey = localStorage.getItem('openrouterApiKey_v3') || '';
    apiConfigs.openrouter.key = savedOpenrouterKey;
    dom.openrouterApiKeyInput.value = savedOpenrouterKey;
    
    updateSystemPrompt();
    updateSettingsUI();
}

function updateSettingsUI() {
    dom.workbenchModeValue.innerHTML = `${WORKBENCH_MODES[state.workbenchMode]} <i class="fas fa-chevron-right"></i>`;
    dom.aiModelValue.innerHTML = `${AI_MODELS[state.activeApi]} <i class="fas fa-chevron-right"></i>`;

    document.querySelectorAll('input[name="workbench-mode"]').forEach(radio => {
        radio.parentElement.classList.toggle('selected', radio.value === state.workbenchMode);
    });
    document.querySelectorAll('input[name="ai-model"]').forEach(radio => {
        radio.parentElement.classList.toggle('selected', radio.value === state.activeApi);
    });
    
    dom.openrouterKeySection.classList.toggle('hidden', state.activeApi !== 'openrouter');
}

// --- Theme & Session Management ---
function applyTheme(theme) {
    document.body.className = `transition-colors duration-500 ${theme}`;
    state.uiTheme = theme;
    Object.values(dom.themeIcons).forEach(icon => icon.style.display = 'none');
    
    const lightStyle = document.getElementById('light-theme-style');
    const darkStyle = document.getElementById('dark-theme-style');
    
    if (theme === 'theme-pro-coder') {
        dom.themeIcons.dark.style.display = 'block';
        lightStyle.media = 'not all'; darkStyle.media = 'all';
    } else {
        dom.themeIcons.light.style.display = 'block';
        lightStyle.media = 'all'; darkStyle.media = 'not all';
    }
    localStorage.setItem('uiTheme_v4', theme);
}

function toggleTheme() {
    const currentIndex = state.themes.indexOf(state.uiTheme);
    const nextIndex = (currentIndex + 1) % state.themes.length;
    applyTheme(state.themes[nextIndex]);
}

// --- Session CRUD ---
function createNewSession() {
    const sessionId = `session_${Date.now()}`;
    updateSystemPrompt(); // Make sure prompt is current for new session
    state.sessions[sessionId] = {
        id: sessionId,
        name: `对话 ${Object.keys(state.sessions).length + 1}`,
        chatHistory: [
            { role: "system", text: state.systemPrompt },
            { 
                role: "model", 
                id: Date.now() + 1, 
                parts: [{ text: JSON.stringify({ 
                    thinking: `你好, ${state.currentUser.email}！我是您的AI助手，随时准备为您服务。`,
                    [(state.workbenchMode === 'jsonui' ? 'json' : 'script')]: state.workbenchMode === 'jsonui' ? "[]" : "// 请输入指令..."
                }) }]
            }
        ]
    };
    switchSession(sessionId);
}

function switchSession(sessionId) {
    if (!state.sessions[sessionId]) { 
        if (Object.keys(state.sessions).length > 0) {
             switchSession(Object.keys(state.sessions)[0]);
        } else {
            createNewSession();
        }
        return; 
    }
    state.activeSessionId = sessionId;
    localStorage.setItem(`activeSessionId_v4_${state.currentUser.uid}`, sessionId);
    renderTabs();
    renderActiveChatHistory();
    dom.promptInput.focus();
}

function deleteSession(sessionId) {
    if (Object.keys(state.sessions).length <= 1) {
        showMessage('提示', '这是最后一个对话，无法关闭。', 'info');
        return;
    }
    const sessionName = state.sessions[sessionId].name;
    delete state.sessions[sessionId];
    if (state.activeSessionId === sessionId) {
        switchSession(Object.keys(state.sessions)[0]);
    }
    renderTabs();
    saveSessions();
    showMessage('提示', `对话 ${sessionName} 已关闭。`, 'info');
}

function updateSessionName(sessionId, newName) {
    if(state.sessions[sessionId] && newName && newName.trim() !== '') {
        state.sessions[sessionId].name = newName.trim();
        saveSessions();
        renderTabs();
    }
}

function saveSessions() {
    if (!state.currentUser) return;
    try {
        const sessionsData = JSON.stringify(state.sessions);
        localStorage.setItem(`scriptCatSessions_v13_${state.currentUser.uid}`, sessionsData);
    } catch (e) {
        console.error("Error saving sessions:", e);
        showMessage('错误', '无法保存会话，可能存储空间已满。');
    }
}

function loadSessions() {
    if (!state.currentUser) return;
    const saved = localStorage.getItem(`scriptCatSessions_v13_${state.currentUser.uid}`);
    if (saved) {
        try { state.sessions = JSON.parse(saved); } catch(e) { console.error("Failed to parse sessions", e); state.sessions = {}; }
    } else {
        state.sessions = {};
    }
}

// --- UI Rendering ---
function renderTabs() {
    dom.tabsList.innerHTML = '';
    Object.values(state.sessions).forEach(session => {
        const tab = document.createElement('div');
        tab.className = `tab group relative flex items-center py-2.5 px-5 cursor-pointer text-sm whitespace-nowrap`;
        if (session.id === state.activeSessionId) tab.classList.add('tab-active');
        
        const tabName = document.createElement('span');
        tabName.textContent = session.name;
        tabName.className = 'pr-6';
        tab.appendChild(tabName);
        
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '&times;';
        closeBtn.className = 'absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--secondary-text)] hover:text-[var(--red-color)] rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity';
        closeBtn.title = `关闭 ${session.name}`;
        closeBtn.onclick = (e) => { e.stopPropagation(); deleteSession(session.id); };
        tab.appendChild(closeBtn);

        tab.onclick = () => switchSession(session.id);
        tab.ondblclick = () => { 
            const newName = prompt("为对话设置新名称:", session.name); 
            updateSessionName(session.id, newName); 
        };
        dom.tabsList.appendChild(tab);
    });
}

function renderActiveChatHistory() {
    const session = state.sessions[state.activeSessionId];
    if (!session) {
        dom.chatHistoryDiv.innerHTML = ''; // Clear chat if no session
        return;
    };
    dom.chatHistoryDiv.innerHTML = '';
    session.chatHistory.slice(1).forEach((msg, index) => {
        const isLastMessage = index === session.chatHistory.length - 2;
        addMessageToDisplay(msg, isLastMessage);
    });
    dom.chatHistoryDiv.scrollTop = dom.chatHistoryDiv.scrollHeight;
}

function addMessageToDisplay(message, isLastMessage) {
    const messageWrapper = document.createElement('div');
    messageWrapper.className = 'message-wrapper px-2';
    messageWrapper.dataset.id = message.id;
    const isUser = message.role === 'user';

    if (isUser) {
        messageWrapper.classList.add('user-message', 'w-full', 'flex', 'justify-end');
        const bubble = document.createElement('div');
        bubble.className = 'message-bubble max-w-3xl p-4 shadow-lg';
        bubble.style.overflowWrap = 'break-word';
        if (message.text) {
            const textNode = document.createElement('div');
            textNode.textContent = message.text;
            bubble.appendChild(textNode);
        }
        if (message.attachment) {
            const fileCard = document.createElement('div');
            fileCard.className = 'history-file-card';
            fileCard.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd" /></svg><span>${message.attachment.name}</span>`;
            bubble.appendChild(fileCard);
        }
        messageWrapper.appendChild(bubble);
    } else {
        messageWrapper.classList.add('model-message');
        try {
            const parsed = JSON.parse(message.parts[0].text);
            const thinkingText = (parsed.thinking || "正在思考...").replace(/</g, "&lt;").replace(/>/g, "&gt;");
            const isScriptMode = state.workbenchMode === 'js' || state.workbenchMode === 'js-plus';
            const codeContent = isScriptMode ? (parsed.script || "// 代码生成失败") : (parsed.json || "[]");
            const codeLang = isScriptMode ? 'javascript' : 'json';
            const codeTitle = isScriptMode ? '📄 Script.js' : '📄 UI.json';
            
            const thinkingBubble = `<div class="w-full flex justify-start mb-3"><div class="max-w-3xl"><div class="thinking-bubble p-4 shadow-md">${thinkingText}</div></div></div>`;
            const scriptBlock = `<div class="w-full script-block shadow-lg"><div class="flex justify-between items-center p-3 border-b border-[var(--border-color)] bg-opacity-50 bg-[var(--bg-color)]"><span class="text-sm font-semibold text-[var(--secondary-text)] pl-2">${codeTitle}</span><button class="copy-btn text-xs py-1.5 px-3 rounded-lg font-sans">复制</button></div><pre><code class="language-${codeLang} hljs">${hljs.highlight(codeContent, {language: codeLang, ignoreIllegals: true}).value}</code></pre></div>`;
            messageWrapper.innerHTML = thinkingBubble + scriptBlock;
        } catch(e) {
            console.error("Error parsing model response:", e, message.parts[0].text);
            messageWrapper.innerHTML = `<div class="w-full"><div class="bg-red-100 border border-red-300 text-red-800 p-3 rounded-lg"><b>[解析错误]</b> 无法解析AI的回应...<br><small>${e.message}</small></div></div>`;
        }
    }

    const menu = document.createElement('div');
    menu.className = 'action-menu';
    if (isUser) {
        menu.innerHTML = `<button class="action-button" data-action="edit" title="修改"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd" /></svg></button><button class="action-button" data-action="delete" title="删除"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clip-rule="evenodd" /></svg></button>`;
    } else if (isLastMessage) {
        menu.innerHTML = `<button class="action-button" data-action="regenerate" title="重新生成"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 110 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd" /></svg></button><button class="action-button" data-action="delete" title="删除"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clip-rule="evenodd" /></svg></button>`;
    }
    if (menu.innerHTML) { messageWrapper.appendChild(menu); }
    dom.chatHistoryDiv.appendChild(messageWrapper);
}

// --- Core Logic (API Call) ---
async function handleGeneration(isRegenerating = false) {
    if (!state.currentUser) {
        showMessage('错误', '请先登录。', 'error');
        return;
    }

    // Fetch user-specific API key from Firestore
    const userDoc = await state.db.collection('users').doc(state.currentUser.uid).get();
    const userData = userDoc.data();
    
    // Use user's key if it exists, otherwise use the one from config.js
    const userApiKey = userData?.apiKey;
    const config = apiConfigs[state.activeApi];
    
    if (state.activeApi === 'openrouter' && (userApiKey || config.key) === "") {
        showMessage('错误', '请先在右上角设置中配置 OpenRouter API 密钥。', 'error');
        return;
    }

    const activeSession = state.sessions[state.activeSessionId];
    if (!activeSession) return;
    
    updateSystemPrompt();
    if(activeSession.chatHistory[0].role === 'system') {
        activeSession.chatHistory[0].text = state.systemPrompt;
    }

    const userPromptText = dom.promptInput.value.trim();
    if (!userPromptText && !state.attachedFile && !state.editingMessageId && !isRegenerating) return;
    
    if (!isRegenerating) {
        const userMessage = { role: "user", id: Date.now(), text: userPromptText, attachment: state.attachedFile };
        if (state.editingMessageId) {
            const msgIndex = activeSession.chatHistory.findIndex(m => m.id === state.editingMessageId);
            if (msgIndex > -1) {
                activeSession.chatHistory[msgIndex] = userMessage;
                activeSession.chatHistory.splice(msgIndex + 1);
            }
            state.editingMessageId = null;
        } else {
            activeSession.chatHistory.push(userMessage);
        }
    }
    
    dom.promptInput.value = '';
    removeFileAttachment();
    renderActiveChatHistory();
    hideMessage();
    setLoading(true, true);
    
    const historyForApi = activeSession.chatHistory;
    let apiURL = config.url;
    let headers = { 'Content-Type': 'application/json' };
    let bodyPayload;
    
    if (state.activeApi === 'google') {
        const effectiveApiKey = userApiKey || config.key;
        apiURL = `${config.url}?key=${effectiveApiKey}`;
        const googleHistory = historyForApi
            .map(msg => {
                let combinedText = msg.text || '';
                if (msg.role === 'user' && msg.attachment) {
                    combinedText += `\n\n--- User attached file: ${msg.attachment.name} ---\n${msg.attachment.content}\n--- End file content ---`;
                }
                const role = msg.role === 'system' ? 'user' : msg.role;
                const parts = msg.parts || [{text: combinedText}];
                if (msg.role === 'system') {
                    return { role: 'user', parts: [{ text: state.systemPrompt }, ...parts]};
                }
                return { role, parts };
            });
        
        const finalGoogleHistory = [];
        finalGoogleHistory.push({ role: 'user', parts: [{ text: state.systemPrompt }] });
        googleHistory.slice(1).forEach(msg => finalGoogleHistory.push(msg));
        bodyPayload = { contents: finalGoogleHistory.slice(-MAX_HISTORY_LENGTH) };

    } else { // openrouter
        const effectiveApiKey = userApiKey || config.key;
        headers['Authorization'] = `Bearer ${effectiveApiKey}`;
        const messagesForApi = [{ role: 'system', content: state.systemPrompt }];
        historyForApi.filter(m => m.role !== 'system').slice(-MAX_HISTORY_LENGTH).forEach(msg => {
            if (msg.role === 'user') {
                let combinedText = msg.text || '';
                if (msg.attachment) { combinedText += `\n\n--- User attached file: ${msg.attachment.name} ---\n${msg.attachment.content}\n--- End file content ---`; }
                messagesForApi.push({ role: 'user', content: combinedText });
            } else if (msg.role === 'model') {
                messagesForApi.push({ role: 'assistant', content: msg.parts[0].text });
            }
        });
        bodyPayload = { model: config.model, messages: messagesForApi };
    }
    
    state.abortController = new AbortController();
    try {
        const response = await fetch(apiURL, { method: 'POST', headers, body: JSON.stringify(bodyPayload), signal: state.abortController.signal });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || `API 请求失败: ${response.status}`);
        }
        const result = await response.json();
        if (state.abortController.signal.aborted) return;
        
        let rawText = state.activeApi === 'google' ? result.candidates?.[0]?.content?.parts?.[0]?.text : result.choices?.[0]?.message?.content;
        if (rawText) {
            const jsonStart = rawText.indexOf('{');
            const jsonEnd = rawText.lastIndexOf('}');
            if (jsonStart !== -1 && jsonEnd > jsonStart) {
                const jsonString = rawText.substring(jsonStart, jsonEnd + 1);
                activeSession.chatHistory.push({ role: "model", id: Date.now(), parts: [{ text: jsonString }] });
                renderActiveChatHistory();
                dom.chatHistoryDiv.lastElementChild?.scrollIntoView({ behavior: 'smooth' });
            } else {
                throw new Error(`AI回应中找不到有效的JSON数据。`);
            }
        } else {
            throw new Error(`AI没有返回任何内容...`);
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            showMessage('提示', '已停止生成！', 'info');
        } else {
            showMessage('错误', error.message);
        }
        renderActiveChatHistory();
    } finally {
        if (!state.abortController?.signal.aborted) {
            setLoading(false);
            state.abortController = null;
            saveSessions();
        }
    }
}

// --- Event Listeners (only setup after login) ---
function setupEventListeners() {
    // Prevent setting up listeners multiple times
    if (dom.generateBtn.dataset.listener) return;
    dom.generateBtn.dataset.listener = 'true';

    dom.chatHistoryDiv.addEventListener('click', e => {
        const copyButton = e.target.closest('.copy-btn');
        if (copyButton) {
            const codeElement = copyButton.closest('.script-block').querySelector('code');
            if (codeElement) {
                navigator.clipboard.writeText(codeElement.textContent).then(() => {
                    copyButton.textContent = '已复制!';
                    copyButton.classList.add('copied');
                    setTimeout(() => {
                        copyButton.textContent = '复制';
                        copyButton.classList.remove('copied');
                    }, 2000);
                }).catch(err => showMessage('错误', '复制失败。'));
            }
            return;
        }
        
        const actionButton = e.target.closest('.action-button');
        if (!actionButton) return;
        const messageWrapper = e.target.closest('.message-wrapper');
        const messageId = Number(messageWrapper.dataset.id);
        const action = actionButton.dataset.action;
        const session = state.sessions[state.activeSessionId];
        const msgIndex = session.chatHistory.findIndex(m => m.id === messageId);
        if (msgIndex === -1) return;

        const messageToActOn = session.chatHistory[msgIndex];
        switch (action) {
            case 'delete':
                if (messageToActOn.role === 'user' && session.chatHistory[msgIndex+1]?.role === 'model') {
                    session.chatHistory.splice(msgIndex, 2);
                } else {
                    session.chatHistory.splice(msgIndex, 1);
                }
                renderActiveChatHistory();
                saveSessions();
                break;
            case 'edit':
                if(messageToActOn.role === 'user') {
                    dom.promptInput.value = messageToActOn.text || '';
                    dom.promptInput.focus();
                    state.attachedFile = messageToActOn.attachment || null;
                    renderFileAttachment();
                    state.editingMessageId = messageToActOn.id;
                    setLoading(false);
                }
                break;
            case 'regenerate':
                session.chatHistory.splice(msgIndex);
                renderActiveChatHistory();
                handleGeneration(true);
                break;
        }
    });

    dom.fileUploadInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            state.attachedFile = { name: file.name, content: event.target.result };
            renderFileAttachment();
        };
        reader.onerror = () => showMessage('错误', `读取文件 ${file.name} 时发生错误。`);
        reader.readAsText(file);
    });
    
    dom.generateBtn.addEventListener('click', () => {
        if (state.abortController) {
            state.abortController.abort();
            setLoading(false);
        } else {
            handleGeneration();
        }
    });
    
    dom.promptInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            dom.generateBtn.click();
        }
    });
    
    dom.addTabBtn.addEventListener('click', createNewSession);
    dom.themeToggleBtn.addEventListener('click', toggleTheme);
    
    dom.settingsBtn.addEventListener('click', openSettings);
    dom.settingsOverlay.addEventListener('click', () => { saveAndApplySettings(); closeSettings(); });
    dom.closeSettingsBtn.addEventListener('click', () => { saveAndApplySettings(); closeSettings(); });
    dom.workbenchModeBtn.addEventListener('click', (e) => { e.stopPropagation(); togglePopup(dom.workbenchModePopup); });
    dom.aiModelBtn.addEventListener('click', (e) => { e.stopPropagation(); togglePopup(dom.aiModelPopup); });
    
    document.querySelectorAll('.settings-popup input[type="radio"]').forEach(radio => {
        radio.addEventListener('change', () => {
            saveAndApplySettings();
            setTimeout(() => {
                if(state.openPopup) state.openPopup.classList.remove('is-active');
                state.openPopup = null;
            }, 150);
        });
    });

    document.addEventListener('click', (e) => {
        if (state.openPopup && !state.openPopup.contains(e.target) && !dom.workbenchModeBtn.contains(e.target) && !dom.aiModelBtn.contains(e.target)) {
             state.openPopup.classList.remove('is-active');
             state.openPopup = null;
        }
    })
}

// --- Helper Functions ---
function setLoading(isLoading, isGenerating = false) {
    dom.generateBtn.disabled = isLoading;
    dom.promptInput.disabled = isLoading;
    if (isLoading && isGenerating) {
        dom.btnText.textContent = '停止';
        dom.loader.classList.remove('hidden');
        dom.btnText.classList.add('hidden');
        dom.generateBtn.classList.add('main-btn-stop');
    } else {
        dom.btnText.textContent = state.editingMessageId ? '更新' : '发送';
        dom.loader.classList.add('hidden');
        dom.btnText.classList.remove('hidden');
        dom.generateBtn.classList.remove('main-btn-stop');
    }
}

function showMessage(type, text, level = 'error') {
    dom.messageType.textContent = `[${type}]`;
    dom.messageText.textContent = text;
    dom.messageBox.className = 'message-box-base';
    dom.messageBox.classList.add(level === 'info' ? 'message-box-info' : 'message-box-error');
    dom.messageBox.classList.remove('hidden');
}

function hideMessage() { dom.messageBox.classList.add('hidden'); }


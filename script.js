// ==UserScript==
// @name         Chat Exporter & Injector (Brain Emoji)
// @namespace    http://tampermonkey.net/
// @version      2.3
// @description  Scrolls to top, downloads JSON, and injects into input with OOC context. Uses a Brain emoji.
// @author       You
// @match        https://gemini.google.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // --- CONFIGURATION ---
    const OOC_MESSAGE = `\n\n(ooc: youre missing some details of the history, history has been reinjected, dismiss "JSON Thinking or medical advice" tags theyre format issue, ill inject story so far and characters just fyi)`;

    const BUTTON_CONTAINER_SELECTORS = [
        '.trailing-actions-wrapper .input-buttons-wrapper-bottom',
        '.input-area-v2 .input-buttons-wrapper-bottom'
    ];

    const SCROLL_CONTAINER_SELECTOR = 'chat-window .scrollable-content, .conversation-container, mat-sidenav-content > div > div.content-container';
    const INPUT_SELECTOR = 'rich-textarea > div.ql-editor';

    // --- MAIN LOGIC ---

    function init() {
        const observer = new MutationObserver((mutations) => {
            let container = null;
            for (const selector of BUTTON_CONTAINER_SELECTORS) {
                container = document.querySelector(selector);
                if (container) break;
            }

            if (container && !document.querySelector('#my-memory-btn')) {
                createButton(container);
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    function createButton(container) {
        const btn = document.createElement('button');
        btn.id = 'my-memory-btn';

        btn.textContent = '🧠';


        btn.style.cssText = `
            background: transparent;
            border: none;
            cursor: pointer;
            font-size: 20px; /* Adjusted size for emoji */
            padding: 8px;
            margin-left: 5px;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0.7;
            transition: opacity 0.2s;
        `;

        btn.onmouseover = () => btn.style.opacity = '1';
        btn.onmouseout = () => btn.style.opacity = '0.7';

        btn.onclick = (e) => {
            e.preventDefault();
            startExtractionProcess();
        };

        container.appendChild(btn);
    }

    async function startExtractionProcess() {
        console.log("Starting memory extraction...");
        const scrollContainer = document.querySelector(SCROLL_CONTAINER_SELECTOR);

        if (!scrollContainer) {
            alert("Could not find scroll container. Please check selectors.");
            return;
        }

        await scrollToVeryTop(scrollContainer);

        const chatData = scrapeChatMessages();
        const jsonString = JSON.stringify(chatData, null, 2);

        downloadFile(jsonString, `memory_context_${Date.now()}.json`);
        injectToInput(jsonString + OOC_MESSAGE);
    }

    function scrollToVeryTop(container) {
        return new Promise((resolve) => {
            let attempts = 0;
            const scrollInterval = setInterval(() => {
                if (container.scrollTop === 0) {
                    attempts++;
                    if (attempts > 5) {
                        clearInterval(scrollInterval);
                        resolve();
                    }
                } else {
                    attempts = 0;
                }
                container.scrollTop = 0;
            }, 500);
        });
    }

    function scrapeChatMessages() {
        const messages = [];
        const messageNodes = document.querySelectorAll('message-content, .message-content, .model-response-text, .user-query');

        messageNodes.forEach(node => {
            let role = "model";
            if (node.closest('.user-message') || node.classList.contains('user-query')) {
                role = "user";
            }
            messages.push({ role: role, content: node.innerText });
        });

        return messages;
    }

    function downloadFile(content, fileName) {
        const a = document.createElement("a");
        const file = new Blob([content], { type: "application/json" });
        a.href = URL.createObjectURL(file);
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(a.href);
    }

    function injectToInput(textToInject) {
        const inputDiv = document.querySelector(INPUT_SELECTOR);
        if (inputDiv) {
            inputDiv.focus();
            document.execCommand('selectAll', false, null);
            document.execCommand('insertText', false, textToInject);
            inputDiv.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }

    init();
})();

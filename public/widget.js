(function() {
    'use strict';

    // Widget configuration
    const config = {
        agentId: null,
        apiUrl: window.location.origin,
        widgetId: 'bb-chat-widget',
        position: 'bottom-right',
        width: 350,
        height: 500,
        theme: {
            primaryColor: '#007bff',
            secondaryColor: '#6c757d',
            backgroundColor: '#ffffff',
            textColor: '#333333',
            borderRadius: '12px',
            shadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
        },
        messages: {
            welcome: "Hello! I'm here to help you. How can I assist you today?",
            placeholder: "Type your message...",
            sendButton: "Send"
        }
    };

    // Get agent ID from script tag
    const script = document.currentScript || document.querySelector('script[data-agent-id]');
    if (script && script.getAttribute('data-agent-id')) {
        config.agentId = script.getAttribute('data-agent-id');
    } else {
        console.error('BB Chat Widget: Missing data-agent-id attribute');
        return;
    }

    // Widget state
    let isOpen = false;
    let isMinimized = false;
    let messages = [];
    let isTyping = false;
    let webhookUrl = null;

    // Create widget HTML
    function createWidget() {
        const widgetHTML = `
            <div id="${config.widgetId}" style="
                position: fixed;
                ${config.position.includes('bottom') ? 'bottom: 20px;' : 'top: 20px;'}
                ${config.position.includes('right') ? 'right: 20px;' : 'left: 20px;'}
                z-index: 9999;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            ">
                <!-- Chat Button -->
                <div id="${config.widgetId}-button" style="
                    width: 60px;
                    height: 60px;
                    background-color: ${config.theme.primaryColor};
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    box-shadow: ${config.theme.shadow};
                    transition: all 0.3s ease;
                    color: white;
                    font-size: 24px;
                " title="Chat with us">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                </div>

                <!-- Chat Window -->
                <div id="${config.widgetId}-window" style="
                    position: absolute;
                    ${config.position.includes('bottom') ? 'bottom: 80px;' : 'top: 80px;'}
                    ${config.position.includes('right') ? 'right: 0;' : 'left: 0;'}
                    width: ${config.width}px;
                    height: ${config.height}px;
                    background-color: ${config.theme.backgroundColor};
                    border-radius: ${config.theme.borderRadius};
                    box-shadow: ${config.theme.shadow};
                    display: none;
                    flex-direction: column;
                    overflow: hidden;
                    border: 1px solid #e9ecef;
                ">
                    <!-- Header -->
                    <div style="
                        background-color: ${config.theme.primaryColor};
                        color: white;
                        padding: 15px 20px;
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        border-radius: ${config.theme.borderRadius} ${config.theme.borderRadius} 0 0;
                    ">
                        <div style="font-weight: 600; font-size: 16px;">Chat with AI</div>
                        <div style="display: flex; gap: 10px;">
                            <button id="${config.widgetId}-minimize" style="
                                background: none;
                                border: none;
                                color: white;
                                cursor: pointer;
                                padding: 5px;
                                border-radius: 4px;
                                transition: background-color 0.2s;
                            " title="Minimize">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                </svg>
                            </button>
                            <button id="${config.widgetId}-close" style="
                                background: none;
                                border: none;
                                color: white;
                                cursor: pointer;
                                padding: 5px;
                                border-radius: 4px;
                                transition: background-color 0.2s;
                            " title="Close">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>
                    </div>

                    <!-- Messages Container -->
                    <div id="${config.widgetId}-messages" style="
                        flex: 1;
                        overflow-y: auto;
                        padding: 20px;
                        background-color: #f8f9fa;
                    ">
                        <!-- Messages will be inserted here -->
                    </div>

                    <!-- Input Container -->
                    <div style="
                        padding: 15px 20px;
                        border-top: 1px solid #e9ecef;
                        background-color: ${config.theme.backgroundColor};
                    ">
                        <form id="${config.widgetId}-form" style="display: flex; gap: 10px; align-items: center;">
                            <input id="${config.widgetId}-input" type="text" placeholder="${config.messages.placeholder}" style="
                                flex: 1;
                                padding: 10px 15px;
                                border: 1px solid #ced4da;
                                border-radius: 20px;
                                font-size: 14px;
                                outline: none;
                                transition: border-color 0.2s;
                            ">
                            <button type="submit" style="
                                background-color: ${config.theme.primaryColor};
                                color: white;
                                border: none;
                                border-radius: 50%;
                                width: 40px;
                                height: 40px;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                cursor: pointer;
                                transition: background-color 0.2s;
                            ">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <line x1="22" y1="2" x2="11" y2="13"></line>
                                    <polygon points="22,2 15,22 11,13 2,9"></polygon>
                                </svg>
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', widgetHTML);
    }

    // Load messages from localStorage
    function loadMessages() {
        const storedMessages = localStorage.getItem(`bb_widget_messages_${config.agentId}`);
        if (storedMessages) {
            try {
                const parsedMessages = JSON.parse(storedMessages);
                messages = parsedMessages.map(msg => ({
                    ...msg,
                    timestamp: new Date(msg.timestamp)
                }));
                
                // Display stored messages
                messages.forEach(msg => {
                    displayMessage(msg.content, msg.sender, msg.timestamp);
                });
            } catch (error) {
                console.error('Error loading messages from localStorage:', error);
            }
        }
    }

    // Save messages to localStorage
    function saveMessages() {
        localStorage.setItem(`bb_widget_messages_${config.agentId}`, JSON.stringify(messages));
    }

    // Display message in chat
    function displayMessage(content, sender = 'bot', timestamp = new Date()) {
        const messagesContainer = document.getElementById(`${config.widgetId}-messages`);
        const messageDiv = document.createElement('div');
        
        const isUser = sender === 'user';
        const messageStyle = `
            margin-bottom: 15px;
            display: flex;
            flex-direction: column;
            align-items: ${isUser ? 'flex-end' : 'flex-start'};
        `;
        
        const bubbleStyle = `
            max-width: 75%;
            padding: 12px 16px;
            border-radius: 18px;
            line-height: 1.4;
            word-wrap: break-word;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            background-color: ${isUser ? config.theme.primaryColor : 'white'};
            color: ${isUser ? 'white' : config.theme.textColor};
            border: ${isUser ? 'none' : '1px solid #e9ecef'};
            border-bottom-${isUser ? 'right' : 'left'}-radius: 5px;
        `;

        messageDiv.style.cssText = messageStyle;
        messageDiv.innerHTML = `
            <div style="${bubbleStyle}">
                ${escapeHtml(content)}
            </div>
        `;

        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Add message to chat and save to localStorage
    function addMessage(content, sender = 'bot', timestamp = new Date()) {
        displayMessage(content, sender, timestamp);
        messages.push({ content, sender, timestamp });
        saveMessages();
    }

    // Show typing indicator
    function showTypingIndicator() {
        if (isTyping) return;
        isTyping = true;
        
        const messagesContainer = document.getElementById(`${config.widgetId}-messages`);
        const typingDiv = document.createElement('div');
        typingDiv.id = `${config.widgetId}-typing`;
        typingDiv.style.cssText = `
            margin-bottom: 15px;
            display: flex;
            flex-direction: column;
            align-items: flex-start;
        `;
        typingDiv.innerHTML = `
            <div style="
                max-width: 75%;
                padding: 12px 16px;
                border-radius: 18px;
                background-color: white;
                border: 1px solid #e9ecef;
                border-bottom-left-radius: 5px;
            ">
                <div style="display: flex; align-items: center; gap: 3px;">
                    <div style="width: 7px; height: 7px; background: #bbb; border-radius: 50%; animation: typing-bounce 1.2s infinite both;"></div>
                    <div style="width: 7px; height: 7px; background: #bbb; border-radius: 50%; animation: typing-bounce 1.2s infinite both; animation-delay: 0.2s;"></div>
                    <div style="width: 7px; height: 7px; background: #bbb; border-radius: 50%; animation: typing-bounce 1.2s infinite both; animation-delay: 0.4s;"></div>
                </div>
            </div>
        `;
        
        messagesContainer.appendChild(typingDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Hide typing indicator
    function hideTypingIndicator() {
        isTyping = false;
        const typingDiv = document.getElementById(`${config.widgetId}-typing`);
        if (typingDiv) {
            typingDiv.remove();
        }
    }

    // Get webhook URL from server
    async function getWebhookUrl() {
        if (webhookUrl) return webhookUrl;
        
        try {
            const response = await fetch('/api/widget/config');
            if (!response.ok) {
                throw new Error('Failed to get webhook configuration');
            }
            const data = await response.json();
            webhookUrl = data.webhookUrl;
            return webhookUrl;
        } catch (error) {
            console.error('Error getting webhook URL:', error);
            throw new Error('Webhook configuration error');
        }
    }

    // Send message to webhook
    async function sendMessage(content) {
        try {
            showTypingIndicator();
            
            // Get webhook URL from server
            const webhookUrl = await getWebhookUrl();
            
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    agent_id: config.agentId,
                    message: content,
                    session_id: getSessionId()
                })
            });

            if (!response.ok) {
                throw new Error('Failed to send message');
            }

            const data = await response.json();
            hideTypingIndicator();
            
            if (data.output) {
                addMessage(data.output, 'bot');
            } else {
                addMessage('Sorry, I encountered an error. Please try again.', 'bot');
            }
        } catch (error) {
            console.error('Error sending message:', error);
            hideTypingIndicator();
            addMessage('Sorry, I encountered an error. Please try again.', 'bot');
        }
    }

    // Get or create visitor ID
    function getVisitorId() {
        let visitorId = localStorage.getItem('bb_visitor_id');
        if (!visitorId) {
            visitorId = 'visitor_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('bb_visitor_id', visitorId);
        }
        return visitorId;
    }

    // Get or create session ID
    function getSessionId() {
        let sessionId = localStorage.getItem(`bb_session_id_${config.agentId}`);
        if (!sessionId) {
            sessionId = 'session_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem(`bb_session_id_${config.agentId}`, sessionId);
        }
        return sessionId;
    }

    // Escape HTML to prevent XSS
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Toggle chat window
    function toggleChat() {
        const window = document.getElementById(`${config.widgetId}-window`);
        const button = document.getElementById(`${config.widgetId}-button`);
        
        if (isOpen) {
            window.style.display = 'none';
            button.style.transform = 'scale(1)';
        } else {
            window.style.display = 'flex';
            button.style.transform = 'scale(0.9)';
            
            // Load existing messages or add welcome message
            if (messages.length === 0) {
                loadMessages();
                if (messages.length === 0) {
                    addMessage(config.messages.welcome, 'bot');
                }
            }
        }
        
        isOpen = !isOpen;
    }

    // Initialize widget
    function init() {
        createWidget();
        
        // Add CSS animations
        const style = document.createElement('style');
        style.textContent = `
            @keyframes typing-bounce {
                0%, 80%, 100% { transform: scale(0.7); opacity: 0.7; }
                40% { transform: scale(1); opacity: 1; }
            }
            
            #${config.widgetId}-button:hover {
                transform: scale(1.1) !important;
            }
            
            #${config.widgetId}-minimize:hover,
            #${config.widgetId}-close:hover {
                background-color: rgba(255, 255, 255, 0.2) !important;
            }
            
            #${config.widgetId}-input:focus {
                border-color: ${config.theme.primaryColor} !important;
                box-shadow: 0 0 0 0.2rem ${config.theme.primaryColor}33 !important;
            }
        `;
        document.head.appendChild(style);

        // Event listeners
        document.getElementById(`${config.widgetId}-button`).addEventListener('click', toggleChat);
        document.getElementById(`${config.widgetId}-close`).addEventListener('click', toggleChat);
        document.getElementById(`${config.widgetId}-minimize`).addEventListener('click', () => {
            document.getElementById(`${config.widgetId}-window`).style.display = 'none';
            isOpen = false;
        });

        document.getElementById(`${config.widgetId}-form`).addEventListener('submit', (e) => {
            e.preventDefault();
            const input = document.getElementById(`${config.widgetId}-input`);
            const message = input.value.trim();
            
            if (message) {
                addMessage(message, 'user');
                input.value = '';
                sendMessage(message);
            }
        });

        // Handle Enter key
        document.getElementById(`${config.widgetId}-input`).addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                document.getElementById(`${config.widgetId}-form`).dispatchEvent(new Event('submit'));
            }
        });
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})(); 
(function() {
    'use strict';

    // Widget configuration
    const config = {
        agentId: null,
        apiUrl: null, // Will be set from script source
        widgetId: 'bb-chat-widget',
        position: 'bottom-right',
        width: 350,
        height: 500,
        theme: {
            primaryColor: '#1976d2',
            secondaryColor: '#757575',
            backgroundColor: '#ffffff',
            textColor: '#1c1c1c',
            headerColor: '#f5f5f5',
            borderRadius: '16px',
            shadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
            inputBorder: '#e5e5e5'
        },
        messages: {
            welcome: "Hello! I'm your AI assistant. How can I help you today?",
            placeholder: "Ask me anything...",
            sendButton: "Send"
        }
    };

    // Get agent ID and API URL from script tag
    const script = document.currentScript || document.querySelector('script[data-agent-id]');
    if (script && script.getAttribute('data-agent-id')) {
        config.agentId = script.getAttribute('data-agent-id');
        
        // Get API URL from script source
        const scriptSrc = script.src;
        if (scriptSrc) {
            const url = new URL(scriptSrc);
            config.apiUrl = url.origin;
        } else {
            config.apiUrl = window.location.origin;
        }
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
    let agentData = null;

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
                    width: 64px;
                    height: 64px;
                    background: linear-gradient(135deg, ${config.theme.primaryColor} 0%, #1565c0 100%);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    box-shadow: ${config.theme.shadow};
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    color: white;
                    font-size: 20px;
                    border: 2px solid rgba(255, 255, 255, 0.2);
                " title="Chat with AI Assistant">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        <path d="M8 10h.01M12 10h.01M16 10h.01"></path>
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
                        background: linear-gradient(135deg, ${config.theme.headerColor} 0%, #fafafa 100%);
                        color: ${config.theme.textColor};
                        padding: 20px 24px;
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        border-radius: ${config.theme.borderRadius} ${config.theme.borderRadius} 0 0;
                        border-bottom: 1px solid #e0e0e0;
                    ">
                        <div style="
                            display: flex;
                            align-items: center;
                            gap: 12px;
                        ">
                            <div id="${config.widgetId}-avatar" style="
                                width: 32px;
                                height: 32px;
                                background: linear-gradient(135deg, ${config.theme.primaryColor} 0%, #1565c0 100%);
                                border-radius: 8px;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                color: white;
                                font-weight: 700;
                                font-size: 14px;
                                overflow: hidden;
                            ">AI</div>
                            <div id="${config.widgetId}-name" style="
                                font-weight: 600;
                                font-size: 16px;
                                color: ${config.theme.textColor};
                            ">AI Assistant</div>
                        </div>
                        <div style="display: flex; gap: 8px;">
                            <button id="${config.widgetId}-clear" style="
                                background: none;
                                border: none;
                                color: ${config.theme.secondaryColor};
                                cursor: pointer;
                                padding: 8px;
                                border-radius: 6px;
                                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                                display: flex;
                                align-items: center;
                                justify-content: center;
                            " title="Clear Chat">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                    <polyline points="3,6 5,6 21,6"></polyline>
                                    <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
                                </svg>
                            </button>
                            <button id="${config.widgetId}-minimize" style="
                                background: none;
                                border: none;
                                color: ${config.theme.secondaryColor};
                                cursor: pointer;
                                padding: 8px;
                                border-radius: 6px;
                                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                                display: flex;
                                align-items: center;
                                justify-content: center;
                            " title="Minimize">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                </svg>
                            </button>
                            <button id="${config.widgetId}-close" style="
                                background: none;
                                border: none;
                                color: ${config.theme.secondaryColor};
                                cursor: pointer;
                                padding: 8px;
                                border-radius: 6px;
                                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                                display: flex;
                                align-items: center;
                                justify-content: center;
                            " title="Close">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
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
                        padding: 24px;
                        background: linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%);
                        background-color: #fafafa;
                    ">
                        <!-- Messages will be inserted here -->
                    </div>

                    <!-- Input Container -->
                    <div style="
                        padding: 20px 24px;
                        border-top: 1px solid #e0e0e0;
                        background-color: ${config.theme.backgroundColor};
                    ">
                        <form id="${config.widgetId}-form" style="display: flex; gap: 12px; align-items: center;">
                            <input id="${config.widgetId}-input" type="text" placeholder="${config.messages.placeholder}" style="
                                flex: 1;
                                padding: 12px 16px;
                                border: 1px solid ${config.theme.inputBorder};
                                border-radius: 24px;
                                font-size: 14px;
                                outline: none;
                                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                                background-color: #ffffff;
                                color: ${config.theme.textColor};
                            ">
                            <button type="submit" style="
                                background: linear-gradient(135deg, ${config.theme.primaryColor} 0%, #1565c0 100%);
                                color: white;
                                border: none;
                                border-radius: 50%;
                                width: 44px;
                                height: 44px;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                cursor: pointer;
                                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                                box-shadow: 0 2px 8px rgba(25, 118, 210, 0.3);
                            ">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
            margin-bottom: 20px;
            display: flex;
            flex-direction: column;
            align-items: ${isUser ? 'flex-end' : 'flex-start'};
        `;
        
        const bubbleStyle = `
            max-width: 80%;
            padding: 16px 20px;
            border-radius: 20px;
            line-height: 1.5;
            word-wrap: break-word;
            font-size: 14px;
            box-shadow: ${isUser ? '0 2px 12px rgba(25, 118, 210, 0.15)' : '0 2px 8px rgba(0, 0, 0, 0.08)'};
            background: ${isUser ? 'linear-gradient(135deg, ' + config.theme.primaryColor + ' 0%, #1565c0 100%)' : 'white'};
            color: ${isUser ? 'white' : config.theme.textColor};
            border: ${isUser ? 'none' : '1px solid #e8e8e8'};
            border-bottom-${isUser ? 'right' : 'left'}-radius: 6px;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
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
            margin-bottom: 20px;
            display: flex;
            flex-direction: column;
            align-items: flex-start;
        `;
        typingDiv.innerHTML = `
            <div style="
                max-width: 80%;
                padding: 16px 20px;
                border-radius: 20px;
                background-color: white;
                border: 1px solid #e8e8e8;
                border-bottom-left-radius: 6px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            ">
                <div style="display: flex; align-items: center; gap: 4px;">
                    <div style="width: 8px; height: 8px; background: #ccc; border-radius: 50%; animation: typing-bounce 1.2s infinite both;"></div>
                    <div style="width: 8px; height: 8px; background: #ccc; border-radius: 50%; animation: typing-bounce 1.2s infinite both; animation-delay: 0.2s;"></div>
                    <div style="width: 8px; height: 8px; background: #ccc; border-radius: 50%; animation: typing-bounce 1.2s infinite both; animation-delay: 0.4s;"></div>
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

    // Get webhook URL and agent data from server
    async function getWebhookUrl() {
        if (webhookUrl) return webhookUrl;
        
        try {
            const response = await fetch(`${config.apiUrl}/api/public/widget/config?agent_id=${config.agentId}`);
            if (!response.ok) {
                throw new Error('Failed to get webhook configuration');
            }
            const data = await response.json();
            webhookUrl = data.webhookUrl;
            agentData = data.agent;
            return webhookUrl;
        } catch (error) {
            console.error('Error getting webhook URL:', error);
            throw new Error('Webhook configuration error');
        }
    }

    // Get initials from agent name
    function getInitials(name) {
        if (!name) return 'AI';
        return name.split(' ')
            .map(word => word.charAt(0))
            .join('')
            .toUpperCase()
            .slice(0, 2);
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

    // Clear chat messages
    function clearChat() {
        // Clear messages array
        messages = [];
        
        // Clear localStorage
        localStorage.removeItem(`bb_widget_messages_${config.agentId}`);
        localStorage.removeItem(`bb_session_id_${config.agentId}`);
        
        // Clear displayed messages
        const messagesContainer = document.getElementById(`${config.widgetId}-messages`);
        messagesContainer.innerHTML = '';
        
        // Add welcome message with agent name if available
        const welcomeMessage = agentData && agentData.name 
            ? `Hello! I'm ${agentData.name}. How can I help you today?`
            : config.messages.welcome;
        addMessage(welcomeMessage, 'bot');
    }

    // Update widget header with agent data
    function updateWidgetHeader() {
        const avatarElement = document.getElementById(`${config.widgetId}-avatar`);
        const nameElement = document.getElementById(`${config.widgetId}-name`);
        
        if (agentData && avatarElement && nameElement) {
            // Update name
            nameElement.textContent = agentData.name || 'AI Assistant';
            
            // Update avatar
            if (agentData.imageUrl) {
                avatarElement.innerHTML = `<img src="${agentData.imageUrl}" alt="${agentData.name}" style="
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    border-radius: 8px;
                ">`;
            } else {
                avatarElement.innerHTML = getInitials(agentData.name);
            }
        }
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
            
            // Load agent data and update header
            if (!agentData) {
                getWebhookUrl().then(() => {
                    updateWidgetHeader();
                }).catch(error => {
                    console.error('Error loading agent data:', error);
                });
            }
            
            // Load existing messages or add welcome message
            if (messages.length === 0) {
                loadMessages();
                if (messages.length === 0) {
                    const welcomeMessage = agentData && agentData.name 
                        ? `Hello! I'm ${agentData.name}. How can I help you today?`
                        : config.messages.welcome;
                    addMessage(welcomeMessage, 'bot');
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
                0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
                40% { transform: scale(1); opacity: 1; }
            }
            
            #${config.widgetId}-button:hover {
                transform: scale(1.05) !important;
                box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2) !important;
            }
            
            #${config.widgetId}-clear:hover,
            #${config.widgetId}-minimize:hover,
            #${config.widgetId}-close:hover {
                background-color: rgba(0, 0, 0, 0.05) !important;
                color: ${config.theme.textColor} !important;
            }
            
            #${config.widgetId}-input:focus {
                border-color: ${config.theme.primaryColor} !important;
                box-shadow: 0 0 0 3px rgba(25, 118, 210, 0.1) !important;
            }
            
            #${config.widgetId}-form button[type="submit"]:hover {
                transform: scale(1.05) !important;
                box-shadow: 0 4px 16px rgba(25, 118, 210, 0.4) !important;
            }
            
            #${config.widgetId}-messages::-webkit-scrollbar {
                width: 6px;
            }
            
            #${config.widgetId}-messages::-webkit-scrollbar-track {
                background: transparent;
            }
            
            #${config.widgetId}-messages::-webkit-scrollbar-thumb {
                background: #ddd;
                border-radius: 3px;
            }
            
            #${config.widgetId}-messages::-webkit-scrollbar-thumb:hover {
                background: #bbb;
            }
        `;
        document.head.appendChild(style);

        // Event listeners
        document.getElementById(`${config.widgetId}-button`).addEventListener('click', toggleChat);
        document.getElementById(`${config.widgetId}-close`).addEventListener('click', toggleChat);
        document.getElementById(`${config.widgetId}-clear`).addEventListener('click', clearChat);
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
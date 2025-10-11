import React, { useState, useEffect, useRef } from 'react';
import './Chat.css';
import { db } from '../../firebase';
import { collection, addDoc, serverTimestamp, onSnapshot, orderBy, query, updateDoc, doc } from 'firebase/firestore';
import { HiUsers, HiChartBar, HiUser } from 'react-icons/hi';
import { IoSend, IoReload } from 'react-icons/io5';
import { BiMessageDetail } from 'react-icons/bi';
import { FaCircle } from 'react-icons/fa';

// Fun username generation
const adjectives = ["Happy", "Cool", "Smart", "Purple", "Golden", "Silver", "Blue", "Red", "Green", "Pink", "Sunny", "Bright", "Swift", "Bold", "Gentle", "Mighty", "Cosmic", "Neon", "Crystal", "Electric"];
const nouns = ["Panda", "Cat", "Fox", "Dragon", "Eagle", "Wolf", "Butterfly", "Tiger", "Dolphin", "Phoenix", "Unicorn", "Koala", "Penguin", "Owl", "Hawk", "Bear", "Rabbit", "Lion", "Shark", "Falcon"];

// Color name mapping
const colorMap = {
    "purple": "#9333ea",
    "golden": "#f59e0b",
    "gold": "#f59e0b",
    "silver": "#9ca3af",
    "blue": "#3b82f6",
    "red": "#ef4444",
    "green": "#10b981",
    "pink": "#ec4899",
    "sunny": "#fbbf24",
    "bright": "#facc15",
    "cosmic": "#8b5cf6",
    "neon": "#06b6d4",
    "crystal": "#a855f7",
    "electric": "#0ea5e9",
    "orange": "#f97316",
    "yellow": "#eab308",
    "teal": "#14b8a6",
    "cyan": "#06b6d4",
    "indigo": "#6366f1",
    "violet": "#8b5cf6",
    "rose": "#f43f5e",
    "lime": "#84cc16",
    "emerald": "#10b981",
    "sky": "#0ea5e9",
    "amber": "#f59e0b",
    "fuchsia": "#d946ef",
    "magenta": "#e91e63",
    "mint": "#6ee7b7",
    "coral": "#ff7f7f",
    "navy": "#1e3a8a",
    "maroon": "#881337",
    "olive": "#84cc16",
    "turquoise": "#2dd4bf",
    "lavender": "#c084fc",
    "crimson": "#dc2626",
    "azure": "#3b82f6",
    "scarlet": "#ef4444",
    "jade": "#059669"
};

// User color palette (fallback)
const userColors = [
    "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", 
    "#DFE6E9", "#74B9FF", "#A29BFE", "#FD79A8", "#FDCB6E",
    "#6C5CE7", "#00B894", "#E17055", "#0984E3", "#B2BEC3"
];

// Conversation starters
const icebreakers = [
    "What's your favorite pizza topping?",
    "Coffee or tea?",
    "What's the best movie you've seen recently?",
    "If you could travel anywhere, where would you go?",
    "What's your favorite season?",
    "Cats or dogs?",
    "What's your dream job?",
    "What's the best book you've read?",
    "Morning person or night owl?",
    "What's your favorite hobby?"
];

function Chat() {
    const [messages, setMessages] = useState([]);
    const [messageText, setMessageText] = useState('');
    const [username, setUsername] = useState('');
    const [userColor, setUserColor] = useState('');
    const [activeUsers, setActiveUsers] = useState(new Map());
    const [sendingMessage, setSendingMessage] = useState(false);
    const [showPoll, setShowPoll] = useState(false);
    const [pollQuestion, setPollQuestion] = useState('');
    const [pollOptions, setPollOptions] = useState(['', '']);
    const [activePoll, setActivePoll] = useState(null);
    const [showIcebreaker, setShowIcebreaker] = useState(false);
    const [currentIcebreaker, setCurrentIcebreaker] = useState('');
    const [showCelebration, setShowCelebration] = useState(false);
    const [showMobileUsers, setShowMobileUsers] = useState(false);
    const [isClosingDrawer, setIsClosingDrawer] = useState(false);
    const [isEntering, setIsEntering] = useState(true);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const notificationSound = useRef(null);

    // Generate fun username automatically
    const generateFunUsername = () => {
        const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
        const noun = nouns[Math.floor(Math.random() * nouns.length)];
        return `${adj}${noun}`;
    };

    // Get user color based on color name in username
    const getUserColor = (username) => {
        if (!username) return userColors[0];
        
        // Check if username contains a color name
        const lowerUsername = username.toLowerCase();
        for (const [colorName, colorValue] of Object.entries(colorMap)) {
            if (lowerUsername.includes(colorName)) {
                return colorValue;
            }
        }
        
        // Fallback to hash-based color if no color name found
        let hash = 0;
        for (let i = 0; i < username.length; i++) {
            hash = username.charCodeAt(i) + ((hash << 5) - hash);
        }
        return userColors[Math.abs(hash) % userColors.length];
    };

    // Calculate luminance to determine if color is light or dark
    const getLuminance = (hexColor) => {
        const rgb = parseInt(hexColor.slice(1), 16);
        const r = (rgb >> 16) & 0xff;
        const g = (rgb >> 8) & 0xff;
        const b = (rgb >> 0) & 0xff;
        
        // Calculate relative luminance
        const [rs, gs, bs] = [r, g, b].map(c => {
            c = c / 255;
            return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        });
        
        return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
    };

    // Get styling for username display based on color brightness
    const getUsernameStyle = (color, isOwnMessage = false) => {
        const luminance = getLuminance(color);
        
        // For own messages (green gradient background), always use white text
        if (isOwnMessage) {
            return {
                color: 'rgba(255, 255, 255, 0.95)',
                className: ''
            };
        }
        
        // For light/bright colors, use dark background badge
        if (luminance > 0.5) {
            return {
                color: color,
                className: 'username-bright'
            };
        }
        
        // For dark colors, use normal styling
        return {
            color: color,
            className: ''
        };
    };

    // Play notification sound
    const playNotificationSound = () => {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
    };

    useEffect(() => {
        // Auto-generate username if not exists (NO PROMPT!)
        let storedUsername = localStorage.getItem('username');
        let storedColor = localStorage.getItem('userColor');
        
        if (!storedUsername) {
            storedUsername = generateFunUsername();
            localStorage.setItem('username', storedUsername);
        }
        
        if (!storedColor) {
            storedColor = getUserColor(storedUsername);
            localStorage.setItem('userColor', storedColor);
        }
        
        setUsername(storedUsername);
        setUserColor(storedColor);

        // Entrance animation
        setTimeout(() => {
            setIsEntering(false);
        }, 3000);

        // Show random icebreaker every 5 minutes
        const icebreakerInterval = setInterval(() => {
            const randomIcebreaker = icebreakers[Math.floor(Math.random() * icebreakers.length)];
            setCurrentIcebreaker(randomIcebreaker);
            setShowIcebreaker(true);
            setTimeout(() => setShowIcebreaker(false), 10000); // Hide after 10 seconds
        }, 300000); // Every 5 minutes

        const q = query(collection(db, 'global_messages'), orderBy('createdAt'));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const messagesData = [];
            const uniqueUsers = new Set();
            const previousMessageCount = messages.length;
            
            querySnapshot.forEach((doc) => {
                const messageData = { id: doc.id, ...doc.data() };
                messagesData.push(messageData);
                
                // Track unique usernames (not message counts)
                uniqueUsers.add(messageData.username);
            });
            
            // Convert to Map with count = 1 for each unique user
            const users = new Map();
            uniqueUsers.forEach(user => {
                users.set(user, 1);
            });
            
            // Play sound for new messages (not from self)
            if (messagesData.length > previousMessageCount) {
                const newMessage = messagesData[messagesData.length - 1];
                if (newMessage.username !== storedUsername) {
                    playNotificationSound();
                }
            }
            
            // Celebration mode when many users active
            if (users.size >= 10 && !showCelebration) {
                setShowCelebration(true);
                setTimeout(() => setShowCelebration(false), 5000);
            }
            
            // Replace all messages with real messages from database
            setMessages(messagesData);
            
            setActiveUsers(users);
        });

        return () => {
            unsubscribe();
            clearInterval(icebreakerInterval);
        };
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Handle chat commands
    const handleChatCommand = async (command) => {
        const commands = {
            '/wave': { text: '👋 waves hello!', emoji: '👋' },
            '/dance': { text: '💃 is dancing!', emoji: '💃' },
            '/laugh': { text: '😂 is laughing!', emoji: '😂' },
            '/celebrate': { text: '🎉 is celebrating!', emoji: '🎉' },
            '/love': { text: '❤️ sends love!', emoji: '❤️' },
            '/coffee': { text: '☕ is having coffee!', emoji: '☕' },
            '/pizza': { text: '🍕 wants pizza!', emoji: '🍕' },
            '/thumbsup': { text: '👍 agrees!', emoji: '👍' },
        };

        const cmd = commands[command.toLowerCase()];
        if (cmd) {
            try {
                await addDoc(collection(db, 'global_messages'), {
                    text: cmd.text,
                    username: username,
                    createdAt: serverTimestamp(),
                    isCommand: true,
                    emoji: cmd.emoji
                });
            } catch (error) {
                console.error('Error sending command:', error);
            }
            return true;
        }
        return false;
    };

    // Add reaction to message
    const addReaction = async (messageId, reaction) => {
        try {
            const messageRef = doc(db, 'global_messages', messageId);
            const message = messages.find(m => m.id === messageId);
            const reactions = message.reactions || {};
            
            if (!reactions[reaction]) {
                reactions[reaction] = [];
            }
            
            if (!reactions[reaction].includes(username)) {
                reactions[reaction].push(username);
            }
            
            await updateDoc(messageRef, { reactions });
        } catch (error) {
            console.error('Error adding reaction:', error);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!messageText.trim() || sendingMessage) return;

        // Check for chat commands
        if (messageText.startsWith('/')) {
            const handled = await handleChatCommand(messageText);
            if (handled) {
                setMessageText('');
                return;
            }
        }

        setSendingMessage(true);
        const messageToSend = messageText;
        setMessageText('');

        // Create a temporary message for animation
        const tempMessage = {
            id: 'temp-' + Date.now(),
            text: messageToSend,
            username: username,
            createdAt: new Date(),
            isTemporary: true
        };

        // Add temporary message to show animation
        setMessages(prev => [...prev, tempMessage]);

        try {
            await addDoc(collection(db, 'global_messages'), {
                text: messageToSend,
                username: username,
                createdAt: serverTimestamp(),
            });
        } catch (error) {
            console.error('Error sending message:', error);
            setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
            setMessageText(messageToSend);
        } finally {
            setSendingMessage(false);
        }
    };

    // Change username
    const changeUsername = () => {
        const newUsername = generateFunUsername();
        const newColor = getUserColor(newUsername);
        localStorage.setItem('username', newUsername);
        localStorage.setItem('userColor', newColor);
        setUsername(newUsername);
        setUserColor(newColor);
    };

    const handleCloseDrawer = () => {
        setIsClosingDrawer(true);
        setTimeout(() => {
            setShowMobileUsers(false);
            setIsClosingDrawer(false);
        }, 300); // Match animation duration
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return '';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className={`chat-container ${isEntering ? 'entering' : ''}`}>
            {/* Celebration Effect */}
            {showCelebration && (
                <div className="celebration-overlay">
                    <div className="confetti">🎉</div>
                    <div className="confetti">🎊</div>
                    <div className="confetti">✨</div>
                    <div className="confetti">🎈</div>
                    <div className="confetti">⭐</div>
                    <div className="celebration-message">🎉 Party Mode! 10+ active users! 🎉</div>
                </div>
            )}

            {/* Icebreaker Notification */}
            {showIcebreaker && (
                <div className="icebreaker-notification">
                    <div className="icebreaker-content">
                        <span className="icebreaker-icon">💭</span>
                        <span className="icebreaker-text">{currentIcebreaker}</span>
                    </div>
                </div>
            )}

            {/* Mobile Users Drawer */}
            {showMobileUsers && (
                <div className={`mobile-drawer-overlay ${isClosingDrawer ? 'closing' : ''}`} onClick={handleCloseDrawer}>
                    <div className={`mobile-drawer ${isClosingDrawer ? 'closing' : ''}`} onClick={(e) => e.stopPropagation()}>
                        <div className="drawer-header">
                            <div className="drawer-title">
                                <HiUsers className="drawer-icon" />
                                <h3>Active Users ({activeUsers.size})</h3>
                            </div>
                            <button className="drawer-close" onClick={handleCloseDrawer}>
                                ✕
                            </button>
                        </div>
                        <div className="drawer-content">
                            {Array.from(activeUsers.keys()).map((displayUsername) => {
                                const baseColor = getUserColor(displayUsername);
                                const usernameStyle = getUsernameStyle(baseColor, false);
                                return (
                                    <div 
                                        key={displayUsername} 
                                        className={`drawer-user-item ${displayUsername === username ? 'current-user' : ''}`}
                                    >
                                        <FaCircle 
                                            className="drawer-user-indicator" 
                                            style={{ color: baseColor }} 
                                        />
                                        <span 
                                            className={`drawer-user-name ${usernameStyle.className}`}
                                            style={{ 
                                                color: usernameStyle.color,
                                                fontWeight: 600 
                                            }}
                                        >
                                            {displayUsername}
                                        </span>
                                        {displayUsername === username && (
                                            <span className="you-badge">You</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Enhanced Top Bar */}
            <div className="top-bar">
                <div className="top-bar-content">
                    {/* Left: Branding */}
                    <div className="top-bar-brand">
                        <div className="brand-logo">💬</div>
                        <div className="brand-info">
                            <h1 className="brand-title">WebChat</h1>
                            <p className="brand-subtitle">Global Room</p>
                        </div>
                    </div>
                    
                    {/* Center: Stats */}
                    <div className="top-bar-stats" onClick={() => setShowMobileUsers(true)}>
                        <div className="stat-item active-stat">
                            <span className="active-indicator"></span>
                            <HiUsers className="stat-icon" />
                            <div className="stat-info">
                                <span className="stat-value">{activeUsers.size}</span>
                                <span className="stat-label">Active</span>
                            </div>
                        </div>
                        <div className="stat-divider"></div>
                        <div className="stat-item messages-stat">
                            <BiMessageDetail className="stat-icon" />
                            <div className="stat-info">
                                <span className="stat-value">{messages.length}</span>
                                <span className="stat-label">Messages</span>
                            </div>
                        </div>
                    </div>
                    
                    {/* Right: User Profile */}
                    <div className="top-bar-user">
                        <button className="user-profile-btn" onClick={changeUsername} title="Click to change username">
                            <div className="profile-avatar" style={{ 
                                background: `linear-gradient(135deg, ${userColor}, ${userColor}dd)`
                            }}>
                                <FaCircle className="avatar-icon" />
                            </div>
                            <div className="profile-info">
                                <span className="profile-label">You are</span>
                                <span 
                                    className={`profile-name ${getUsernameStyle(userColor, false).className}`}
                                    style={{ 
                                        color: getUsernameStyle(userColor, false).color,
                                        fontWeight: 600 
                                    }}
                                >{username}</span>
                            </div>
                            <IoReload className="profile-change-icon" />
                        </button>
                    </div>
                </div>
            </div>
            
            {/* Main Content Area with Sidebar */}
            <div className="chat-content">
                {/* Sidebar with Active Users */}
                <div className="sidebar">
                    <div className="sidebar-header">
                        <HiUsers className="sidebar-icon" />
                        <h3>Active Users ({activeUsers.size})</h3>
                    </div>
                    <div className="user-list">
                        {Array.from(activeUsers.keys()).map((displayUsername) => {
                            const baseColor = getUserColor(displayUsername);
                            const usernameStyle = getUsernameStyle(baseColor, false);
                            return (
                                <div 
                                    key={displayUsername} 
                                    className={`user-item ${displayUsername === username ? 'current-user' : ''}`}
                                >
                                    <FaCircle 
                                        className="user-indicator" 
                                        style={{ color: baseColor }} 
                                    />
                                    <span 
                                        className={`user-name ${usernameStyle.className}`}
                                        style={{ 
                                            color: usernameStyle.color,
                                            fontWeight: 600 
                                        }}
                                    >
                                        {displayUsername}
                                    </span>
                                    {displayUsername === username && (
                                        <span className="you-badge">You</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="message-list">
                {messages.map((msg, index) => {
                    // Always calculate color from username (ignore stored userColor)
                    const msgColor = getUserColor(msg.username);
                    const isOwn = msg.username === username;
                    const usernameStyle = getUsernameStyle(msgColor, isOwn);
                    
                    return (
                        <div 
                            key={msg.id} 
                            className={`message ${isOwn ? 'own-message' : ''} ${msg.isTemporary ? 'sending' : ''} ${msg.isCommand ? 'command-message' : ''}`}
                        >
                            <div className="message-content">
                                <div className="message-header">
                                    <span className={`username ${usernameStyle.className}`} style={{ 
                                        color: usernameStyle.color,
                                        fontWeight: 600
                                    }}>
                                        {msg.username}
                                    </span>
                                    <span className="timestamp">{formatTime(msg.createdAt)}</span>
                                    {msg.isTemporary && <IoReload className="sending-indicator" />}
                                </div>
                                <div className="message-text" style={{ 
                                    borderLeftColor: msgColor 
                                }}>
                                    {msg.isCommand && <span className="command-emoji">{msg.emoji}</span>}
                                    {msg.text}
                                </div>
                                
                                {/* Reaction Buttons */}
                                {!msg.isTemporary && (
                                    <div className="reaction-bar">
                                        {['👍', '❤️', '😂', '😮', '🎉'].map((emoji) => (
                                            <button
                                                key={emoji}
                                                className="reaction-btn"
                                                onClick={() => addReaction(msg.id, emoji)}
                                                title={`React with ${emoji}`}
                                            >
                                                {emoji}
                                                {msg.reactions && msg.reactions[emoji] && (
                                                    <span className="reaction-count">
                                                        {msg.reactions[emoji].length}
                                                    </span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                
                                {/* Display Reactions */}
                                {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                                    <div className="reactions-display">
                                        {Object.entries(msg.reactions).map(([emoji, users]) => (
                                            users.length > 0 && (
                                                <span key={emoji} className="reaction-bubble" title={users.join(', ')}>
                                                    {emoji} {users.length}
                                                </span>
                                            )
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
                </div>
            </div>
            
            {/* Message Input Section - Animates Together */}
            <div className="message-input-section">
                {/* Quick Reactions Bar - Sticks to Message Form */}
                <div className="quick-reactions-bar">
                    <div className="quick-reactions-content">
                        <span className="quick-reactions-label">Quick:</span>
                        {['👍', '❤️', '😂', '😮', '🎉', '🔥', '✨', '💯'].map((emoji) => (
                            <button
                                key={emoji}
                                className="quick-reaction-btn"
                                onClick={() => setMessageText(messageText + emoji)}
                                title={`Add ${emoji}`}
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Quick Commands Bar */}
                <div className="quick-commands">
                    <button onClick={() => setMessageText('/wave')} title="Wave hello">👋</button>
                    <button onClick={() => setMessageText('/dance')} title="Dance">💃</button>
                    <button onClick={() => setMessageText('/laugh')} title="Laugh">😂</button>
                    <button onClick={() => setMessageText('/celebrate')} title="Celebrate">🎉</button>
                    <button onClick={() => setMessageText('/love')} title="Send love">❤️</button>
                    <button onClick={() => setMessageText('/coffee')} title="Coffee time">☕</button>
                    <button onClick={() => setMessageText('/pizza')} title="Pizza!">🍕</button>
                    <button onClick={() => setMessageText('/thumbsup')} title="Thumbs up">👍</button>
                </div>

                <form onSubmit={handleSendMessage} className="message-form">
                    <input
                        ref={inputRef}
                        type="text"
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        placeholder="Type a message or /command..."
                        disabled={sendingMessage}
                    />
                    <button type="submit" disabled={sendingMessage || !messageText.trim()}>
                        {sendingMessage ? <IoReload className="icon-sending" /> : <IoSend className="icon-send" />}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default Chat;

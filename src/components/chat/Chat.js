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

// User color palette
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
    const [onlineUsers, setOnlineUsers] = useState(new Map());
    const [sendingMessage, setSendingMessage] = useState(false);
    const [showPoll, setShowPoll] = useState(false);
    const [pollQuestion, setPollQuestion] = useState('');
    const [pollOptions, setPollOptions] = useState(['', '']);
    const [activePoll, setActivePoll] = useState(null);
    const [showIcebreaker, setShowIcebreaker] = useState(false);
    const [currentIcebreaker, setCurrentIcebreaker] = useState('');
    const [showCelebration, setShowCelebration] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const notificationSound = useRef(null);

    // Generate fun username automatically
    const generateFunUsername = () => {
        const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
        const noun = nouns[Math.floor(Math.random() * nouns.length)];
        return `${adj}${noun}`;
    };

    // Get user color (consistent per username)
    const getUserColor = (username) => {
        let hash = 0;
        for (let i = 0; i < username.length; i++) {
            hash = username.charCodeAt(i) + ((hash << 5) - hash);
        }
        return userColors[Math.abs(hash) % userColors.length];
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
            
            // Celebration mode when many users online
            if (users.size >= 10 && !showCelebration) {
                setShowCelebration(true);
                setTimeout(() => setShowCelebration(false), 5000);
            }
            
            // Replace all messages with real messages from database
            setMessages(messagesData);
            
            setOnlineUsers(users);
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
            userColor: userColor,
            createdAt: new Date(),
            isTemporary: true
        };

        // Add temporary message to show animation
        setMessages(prev => [...prev, tempMessage]);

        try {
            await addDoc(collection(db, 'global_messages'), {
                text: messageToSend,
                username: username,
                userColor: userColor,
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

    const formatTime = (timestamp) => {
        if (!timestamp) return '';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="chat-container">
            {/* Celebration Effect */}
            {showCelebration && (
                <div className="celebration-overlay">
                    <div className="confetti">🎉</div>
                    <div className="confetti">🎊</div>
                    <div className="confetti">✨</div>
                    <div className="confetti">🎈</div>
                    <div className="confetti">⭐</div>
                    <div className="celebration-message">🎉 Party Mode! 10+ users online! 🎉</div>
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

            {/* Top Bar with Stats */}
            <div className="online-users-bar">
                <div className="top-bar-left">
                    <div className="online-count">
                        <span className="online-indicator"></span>
                        <HiUsers className="icon-users" />
                        {onlineUsers.size} online
                    </div>
                    <div className="stats-badge">
                        <BiMessageDetail className="icon-chart" />
                        {messages.length} messages
                    </div>
                </div>
                <div className="top-bar-center">
                    <div className="user-list-compact">
                        {Array.from(onlineUsers.keys()).slice(0, 5).map((displayUsername) => (
                            <span 
                                key={displayUsername} 
                                className="user-badge"
                                style={{ borderColor: getUserColor(displayUsername) }}
                            >
                                {displayUsername}
                            </span>
                        ))}
                        {onlineUsers.size > 5 && (
                            <span className="user-badge more">+{onlineUsers.size - 5}</span>
                        )}
                    </div>
                </div>
                <div className="top-bar-right">
                    <button className="username-badge" onClick={changeUsername} title="Change username">
                        <FaCircle className="icon-user" style={{ color: userColor }} />
                        <span style={{ color: userColor }}>{username}</span>
                        <IoReload className="change-icon" />
                    </button>
                </div>
            </div>
            
            <div className="message-list">
                {messages.map((msg, index) => {
                    const msgColor = msg.userColor || getUserColor(msg.username);
                    
                    return (
                        <div 
                            key={msg.id} 
                            className={`message ${msg.username === username ? 'own-message' : ''} ${msg.isTemporary ? 'sending' : ''} ${msg.isCommand ? 'command-message' : ''}`}
                        >
                            <div className="message-content">
                                <div className="message-header">
                                    <span className="username" style={{ color: msgColor }}>
                                        {msg.username}
                                    </span>
                                    <span className="timestamp">{formatTime(msg.createdAt)}</span>
                                    {msg.isTemporary && <IoReload className="sending-indicator" />}
                                </div>
                                <div className="message-text" style={{ 
                                    borderLeftColor: msg.username === username ? userColor : msgColor 
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
    );
}

export default Chat;

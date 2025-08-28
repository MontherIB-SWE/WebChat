import React, { useState, useEffect } from 'react';
import './Chat.css';
import { db } from '../../firebase';
import { collection, addDoc, serverTimestamp, onSnapshot, orderBy, query } from 'firebase/firestore';

function Chat() {
    const [messages, setMessages] = useState([]);
    const [messageText, setMessageText] = useState('');
    const [username, setUsername] = useState('');

    useEffect(() => {
        const storedUsername = localStorage.getItem('username');
        if (storedUsername) {
            setUsername(storedUsername);
        }

        const q = query(collection(db, 'global_messages'), orderBy('createdAt'));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const messagesData = [];
            querySnapshot.forEach((doc) => {
                messagesData.push({ id: doc.id, ...doc.data() });
            });
            setMessages(messagesData);
        });

        return () => unsubscribe();
    }, []);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!messageText.trim()) return;

        let currentUsername = username;
        if (!currentUsername) {
            const newUsername = prompt('Please enter your name:');
            if (newUsername) {
                localStorage.setItem('username', newUsername);
                setUsername(newUsername);
                currentUsername = newUsername;
            } else {
                return; // User cancelled the prompt
            }
        }

        await addDoc(collection(db, 'global_messages'), {
            text: messageText,
            username: currentUsername,
            createdAt: serverTimestamp(),
        });

        setMessageText('');
    };

    return (
        <div className="chat-container">
            <div className="message-list">
                {messages.map((msg) => (
                    <div key={msg.id} className="message">
                        <span className="username">{msg.username}:</span>
                        <span className="text">{msg.text}</span>
                    </div>
                ))}
            </div>
            <form onSubmit={handleSendMessage} className="message-form">
                <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Type your message..."
                />
                <button type="submit">Send</button>
            </form>
        </div>
    );
}

export default Chat;

import './Dashboard.css';
import { db, auth } from '../../firebase';
import { collection, getDocs, doc, setDoc, updateDoc, query, where, addDoc, serverTimestamp, onSnapshot, orderBy } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useEffect, useState, useRef } from 'react';
import { FaHome, FaUser, FaCog, FaPlus, FaSignOutAlt } from 'react-icons/fa';

function Dashboard({ onLogout }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [friends, setFriends] = useState([]);
    const [users, setUsers] = useState([]);
    const [view, setView] = useState('home');
    const [searchTerm, setSearchTerm] = useState('');
    const [newUsername, setNewUsername] = useState('');
    const [loading, setLoading] = useState(true);
    const [selectedFriend, setSelectedFriend] = useState(null);
    const [messageText, setMessageText] = useState('');
    const [messages, setMessages] = useState([]);
    const messagesUnsubscribeRef = useRef([]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, user => {
            if (user) {
                getDocs(query(collection(db, 'users'), where('uid', '==', user.uid)))
                    .then(snapshot => {
                        if (!snapshot.empty) {
                            const userData = snapshot.docs[0].data();
                            setCurrentUser({ id: snapshot.docs[0].id, ...userData });
                            setNewUsername(userData.username);
                        }
                    });
            } else {
                if (onLogout) {
                    onLogout();
                }
                setCurrentUser(null);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, [onLogout]);

    useEffect(() => {
        if (currentUser) {
            fetchUsers();
            fetchFriends();
            // messages will be loaded by a real-time listener when a friend is selected
            console.log('Current User:', currentUser);
            console.log('Friends:', friends);
        }
    }, [currentUser]);

    const fetchUsers = async () => {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const usersData = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setUsers(usersData);
    };

    const fetchConversationMessages = async (friend) => {
        const friendToUse = friend || selectedFriend;
        if (!currentUser || !friendToUse) return;

        try {
            // q1: messages currentUser -> friend
            const q1 = query(collection(db, 'messages'), where('senderId', '==', currentUser.id), where('receiverId', '==', friendToUse.id));
            // q2: messages friend -> currentUser
            const q2 = query(collection(db, 'messages'), where('senderId', '==', friendToUse.id), where('receiverId', '==', currentUser.id));
            // q3: fallback for documents that use participants array
            const q3 = query(collection(db, 'messages'), where('participants', 'array-contains', currentUser.id));

            const [snap1, snap2, snap3] = await Promise.all([getDocs(q1), getDocs(q2), getDocs(q3)]);

            const map = new Map();

            const pushDoc = (d) => {
                const data = d.data();
                // determine timestamp (serverTimestamp fields need to be converted)
                const ts = data.createdAt && data.createdAt.toMillis ? data.createdAt.toMillis() : (d.createTime ? d.createTime.toMillis() : 0);
                const obj = { id: d.id, _ts: ts, ...data };

                // filter to this conversation
                if (Array.isArray(obj.participants)) {
                    if (!obj.participants.includes(friendToUse.id)) return;
                } else {
                    if (!((obj.senderId === currentUser.id && obj.receiverId === friendToUse.id) || (obj.senderId === friendToUse.id && obj.receiverId === currentUser.id))) return;
                }

                map.set(d.id, obj);
            };

            snap1.docs.forEach(pushDoc);
            snap2.docs.forEach(pushDoc);
            snap3.docs.forEach(pushDoc);

            const arr = Array.from(map.values()).sort((a, b) => (a._ts || 0) - (b._ts || 0));
            setMessages(arr);
        } catch (err) {
            console.error('Error fetching conversation messages:', err);
            setMessages([]);
        }
    };

    const fetchFriends = async () => {
        if (!currentUser) return;
        const friendshipsQuery = query(collection(db, 'friendships'), where('users', 'array-contains', currentUser.id));
        const friendshipsSnapshot = await getDocs(friendshipsQuery);

        if (friendshipsSnapshot.empty) {
            setFriends([]);
            return;
        }

        const friendUserIds = friendshipsSnapshot.docs.flatMap(doc =>
            doc.data().users.filter(id => id !== currentUser.id)
        );

        if (friendUserIds.length === 0) {
            setFriends([]);
            return;
        }

        const friendsQuery = query(collection(db, 'users'), where('uid', 'in', friendUserIds));
        const friendsSnapshot = await getDocs(friendsQuery);
        const friendsData = friendsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setFriends(friendsData);
    };

    const sendMessage = async (friend) => {
        if (!currentUser || !friend) {
            alert('Error: Missing user or friend.');
            return;
        }

        if (!messageText || !messageText.trim()) {
            alert('Please enter a message before sending.');
            return;
        }

        try {
            await addDoc(collection(db, 'messages'), {
                senderId: currentUser.id,
                receiverId: friend.id,
                participants: [currentUser.id, friend.id],
                text: messageText.trim(),
                createdAt: serverTimestamp()
            });

            setMessageText('');
            // TODO: refresh messages list if implemented
        } catch (error) {
            console.error('Error sending message: ', error);
            alert('Failed to send message. Please try again.');
        }
    }

    // Real-time listener for messages of the selected conversation
    useEffect(() => {
        // cleanup any existing listeners
        if (Array.isArray(messagesUnsubscribeRef.current) && messagesUnsubscribeRef.current.length) {
            messagesUnsubscribeRef.current.forEach(fn => { try { fn(); } catch (e) { /* ignore */ } });
            messagesUnsubscribeRef.current = [];
        }

        if (!currentUser || !selectedFriend) {
            setMessages([]);
            return;
        }

        // create three listeners and call the unified fetch when any change occurs
        const q1 = query(collection(db, 'messages'), where('senderId', '==', currentUser.id), where('receiverId', '==', selectedFriend.id));
        const q2 = query(collection(db, 'messages'), where('senderId', '==', selectedFriend.id), where('receiverId', '==', currentUser.id));
        const q3 = query(collection(db, 'messages'), where('participants', 'array-contains', currentUser.id));

        const u1 = onSnapshot(q1, () => { fetchConversationMessages(selectedFriend); }, (err) => console.error('messages listener q1 error', err));
        const u2 = onSnapshot(q2, () => { fetchConversationMessages(selectedFriend); }, (err) => console.error('messages listener q2 error', err));
        const u3 = onSnapshot(q3, () => { fetchConversationMessages(selectedFriend); }, (err) => console.error('messages listener q3 error', err));

        messagesUnsubscribeRef.current = [u1, u2, u3];

        return () => {
            if (Array.isArray(messagesUnsubscribeRef.current)) {
                messagesUnsubscribeRef.current.forEach(fn => { try { fn(); } catch (e) { /* ignore */ } });
                messagesUnsubscribeRef.current = [];
            }
        };
    }, [currentUser, selectedFriend]);
    const addFriend = async (friendToAdd) => {
        if (!currentUser) return;

        const friendshipIds = [currentUser.id, friendToAdd.id].sort();
        const friendshipDocId = friendshipIds.join('_');
        const friendshipDocRef = doc(db, 'friendships', friendshipDocId);

        try {
            await setDoc(friendshipDocRef, {
                users: friendshipIds,
                createdAt: new Date()
            });

            fetchFriends();
            alert(`${friendToAdd.username} has been added as a friend!`);
        } catch (error) {
            console.error("Error adding friend: ", error);
            alert("Failed to add friend.");
        }
    };

    const handleUpdateUsername = async (e) => {
        e.preventDefault();
        if (!currentUser || !newUsername.trim()) {
            alert("Username cannot be empty.");
            return;
        }
        const userDocRef = doc(db, 'users', currentUser.id);
        try {
            await updateDoc(userDocRef, {
                username: newUsername
            });
            setCurrentUser(prev => ({ ...prev, username: newUsername }));
            alert("Username updated successfully!");
        } catch (error) {
            console.error("Error updating username: ", error);
            alert("Failed to update username.");
        }
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Error signing out: ", error);
            alert("Failed to sign out.");
        }
    };

    const friendIds = friends.map(f => f.id);

    const filteredUsers = users.filter(user => {
        const nameMatch = user.username && user.username.toLowerCase().includes(searchTerm.toLowerCase());
        const notSelf = user.id !== currentUser?.id;
        const notAlreadyFriend = !friendIds.includes(user.id);
        return nameMatch && notSelf && notAlreadyFriend;
    });

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div className="dashboard-container">
            <nav className="sidebar">
                <div>
                    <FaHome onClick={() => setView('home')} />
                    <FaUser onClick={() => setView('addF')} />
                    <FaCog onClick={() => setView('settings')} />
                    <FaSignOutAlt onClick={handleLogout} className="logout-icon" />
                </div>
              
            </nav>

            <main className="main-content">
                {view === 'home' && (
                    <div className="chat-container">
                        <div className="friend-list-panel">
                            <h2>Friends</h2>
                            <ul>
                                {friends.length > 0 ? friends.map(friend => (
                                    <li
                                        key={friend.id}
                                        className={`friend-item ${selectedFriend?.id === friend.id ? 'selected' : ''}`}
                                        onClick={() => { setSelectedFriend(friend); fetchConversationMessages(friend); }}
                                    >
                                        {friend.username}
                                    </li>
                                )) : <p className="empty-list-message">No friends yet.</p>}
                            </ul>
                        </div>
                        <div className="chat-window-panel">
                            {selectedFriend ? (
                                <div>
                                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                                        <h3>Chat with {selectedFriend.username}</h3>
                                        <button onClick={() => fetchConversationMessages()} style={{padding:'6px 10px'}}>Refresh</button>
                                    </div>
                                    <ul className="message-list">
                                        {messages.map((message) => (
                                            <li
                                                key={message.id}
                                                className={`message-item ${message.senderId === currentUser.id ? 'sent' : 'received'}`}
                                            >
                                                {message.text}
                                            </li>
                                        ))}
                                    </ul>
                                    <div className='message-write'>
                                        <input
                                            type='text'
                                            value={messageText}
                                            onChange={(e) => setMessageText(e.target.value)}
                                            placeholder={`Message ${selectedFriend.username}...`}
                                        />
                                        <button onClick={() => sendMessage(selectedFriend)}>Send</button>
                                    </div>

                                </div>
                            ) : (
                                <div className="no-chat-selected">
                                    <p>Select a friend to start chatting</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {view === 'addF' && (
                    <div className="view-container">
                        <h1>Add a Friend</h1>
                        <input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search for users..."
                        />
                        <ul>
                            {searchTerm && filteredUsers.map(user => (
                                <li key={user.id} className="user-list-item">
                                    <span>{user.username}</span>
                                    <button onClick={() => addFriend(user)} className="add-btn">
                                        <FaPlus /> Add
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {view === 'settings' && (
                    <div className="view-container">
                        <h1>Settings</h1>
                        <form onSubmit={handleUpdateUsername}>
                            <label htmlFor="username-input">Edit Your Username</label>
                            <input
                                id="username-input"
                                value={newUsername}
                                onChange={(e) => setNewUsername(e.target.value)}
                                placeholder="Enter new username"
                            />
                            <button type="submit" className="update-btn">Update Username</button>
                        </form>
                    </div>
                )}
            </main>
        </div>
    );
}

export default Dashboard;

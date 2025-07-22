import './Dashboard.css';
import { db, auth } from '../../firebase';
import { collection, getDocs, doc, setDoc, updateDoc, query, where } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useEffect, useState } from 'react';
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
        }
    }, [currentUser]);

    const fetchUsers = async () => {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const usersData = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setUsers(usersData);
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
                </div>
                <div>
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
                                        onClick={() => setSelectedFriend(friend)}
                                    >
                                        {friend.username}
                                    </li>
                                )) : <p className="empty-list-message">No friends yet.</p>}
                            </ul>
                        </div>
                        <div className="chat-window-panel">
                            {selectedFriend ? (
                                <div>
                                    <h3>Chat with {selectedFriend.username}</h3>
                                    {/* Chat messages and input will go here */}
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

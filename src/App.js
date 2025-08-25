import { useState, useEffect } from 'react';
import './App.css';
import Login from './components/login/Login.js';
import Register from './components/register/Register.js';
import Dashboard from './pages/dashboard/Dashboard.js'; 
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

function App() {
    // Start in a loading state until Firebase reports the current auth status.
    // This prevents briefly rendering the sign-in/register UI on refresh.
    const [view, setView] = useState('loading');
    const [theme, setTheme] = useState('dark'); // Default to dark theme

    useEffect(() => {
        // Check for saved theme preference or default to dark
        const savedTheme = localStorage.getItem('theme') || 'dark';
        setTheme(savedTheme);
        document.documentElement.setAttribute('data-theme', savedTheme);
    }, []);

    useEffect(() => {
        let first = true;
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (first) {
                setView(user ? 'dashboard' : 'login');
                first = false;
            }
        });
        return () => {
            first = false;
            unsubscribe();
        };
    }, []);

    const handleSetView = (newView) => {
        setView(newView);
    };

    const toggleTheme = () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
    };

    return (
        <div className={`App ${theme}`}>
            <button 
                className="theme-toggle" 
                onClick={toggleTheme}
                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            >
                {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            
            {view === 'loading' && <div className="loading">Loading...</div>}
            {view === 'register' && (
                <Register onNavigate={() => handleSetView('login')} />
            )}
            {view === 'login' && (
                <Login onNavigateRegister={() => handleSetView('register')} onLoginSuccess={() => handleSetView('dashboard')} />
            )}
            {view === 'dashboard' && (
                <Dashboard onLogout={() => setView('login')} />
            )}
        </div>
    );
}

export default App;

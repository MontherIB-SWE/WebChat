import { useState, useEffect } from 'react';
import './App.css';
import Login from './components/login/login.js';
import Register from './components/register/Register.js';
import Dashboard from './pages/dashboard/Dashboard.js'; 
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

function App() {

    // Start in a loading state until Firebase reports the current auth status.
    // This prevents briefly rendering the sign-in/register UI on refresh.
    const [view, setView] = useState('loading');

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

    return (
        <div className="App">
            {view === 'loading' && <div>Loading...</div>}
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

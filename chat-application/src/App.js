import { useState } from 'react';
import './App.css';
import Login from './components/login/Login.js';
import Register from './components/register/Register.js';
import Dashboard from './pages/dashboard/Dashborad.js';
function App() {
  
  const [view, setView] = useState('register'); 

  const handleSetView = (newView) => {
    setView(newView);
  };
  
  return (
    <div className="App">
    {view === 'register' && (
      <Register onNavigate={()=>handleSetView('login')} />
    )}  
    {view === 'login' && (
      <Login onNavigateRegister={() => handleSetView('register')} onLoginSuccess={() => handleSetView('dashboard')}/>
    )}
    {view === 'dashboard' && <Dashboard />}
    
    </div>
  );
}

export default App;

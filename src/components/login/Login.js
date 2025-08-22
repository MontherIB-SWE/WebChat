import './Login.css';
import {db,auth} from '../../firebase'
import { doc,getDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useState } from 'react';

function Login({onNavigateRegister,onLoginSuccess}) {

  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');

  const login= async ()=>{

    try {
      await signInWithEmailAndPassword(auth,email,password);
      onLoginSuccess();
    } catch (error) {
      
    }



  }
  
  const register = () =>{
    onNavigateRegister();
  }

  return (
    <div className="Container">
        <h2>Login</h2>
        <form>
            <div>
            <label>Email:</label>
            <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required />
            </div>
            <div>
            <label>Password:</label>
            <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} required />
            </div>
        
        </form>
        <button type="submit" onClick={login}>Login</button>
        <label>don't have an account? <span onClick={register}>register here</span></label>
    </div>
  );
}
export default Login;
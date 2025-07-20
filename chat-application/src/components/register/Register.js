import '../login/Login.css';
import {auth} from '../../firebase'
import { db } from '../../firebase'
import {createUserWithEmailAndPassword} from 'firebase/auth'
import { useState } from 'react';
import { doc,setDoc } from 'firebase/firestore';
function Register({onNavigate}) {

    const [email, setEmail] = useState('');
    const [password, setPassword]=useState('');
    const [username, setUsername]=useState('');

    const handleRegisteration = async ()=>{
        try {
            const userC = await createUserWithEmailAndPassword(auth,email,password);
            const user = userC.user;
            await setDoc(doc(db,"users",user.uid),{
                email:email,
                username:username
            });
            onNavigate();
        } catch (error) {

        }
    }

    
    

  return (
    <div className="Container">
        <h2>Register</h2>
        <form>
            <div>
                <label htmlFor="email">Email:</label>
                <input type="email" value={email} required onChange={(e)=>setEmail(e.target.value)}/>
            </div>
            <div>
                <label htmlFor="username">Username:</label>
                <input type="text" value={username} required onChange={(e)=>setUsername(e.target.value)} />
            </div>
            <div>
                <label htmlFor="password">Password:</label>
                <input type="password" value={password} required onChange={(e)=>setPassword(e.target.value)}/>
            </div>
        </form>
        <button type="submit" onClick={onNavigate}>Register</button>
        <label>already have an account? <span onClick={onNavigate}>sign in here</span></label>

    </div>
  );
}
export default Register;
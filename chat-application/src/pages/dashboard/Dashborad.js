import './Dashboard.css' 
import { db } from '../../firebase'
import { collection,getDocs } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { FaHome, FaUser, FaCog } from 'react-icons/fa';

function Dashboard (){

    const [friends,setFriends] = useState([]);

    useEffect(()=>{
        const fetchFriends =async ()=>{
        const friendsList = await getDocs(collection(db, "friends")).docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setFriends(friendsList);
    };
    },[]);
    return(
        <div>

            <nav>
                <FaHome />
                <FaUser />
                <FaCog /> 
            </nav>

            <ul>
                {friends.map(friend => (
                    <li key={friend.id}>{friend.username}</li>
                ))}
            </ul>




        </div>
    );

}

export default Dashboard;
const express = require('express');
const path = require('path');
const app = express();
const port = 5500;
const mysql = require('mysql2');
const exphbs = require('express-handlebars');
const hbs = exphbs.create();

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root', 
    password: '12345', 
    database: 'chat_project'
});

app.use(express.json());

app.use(express.static(__dirname)); 

app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname)); 

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html')); 
});

app.post('/signup', (req, res) => {
    const { username, password } = req.body;
  
    // Check if the username already exists
    pool.query('SELECT * FROM users WHERE username = ?', [username], (err, results) => {
      if (err) {
        console.error('Error checking for existing user:', err);
        res.status(500).send('Internal Server Error');
      } else {
        if (results.length > 0) {
          // Username already exists
          res.status(409).send('Username already taken');
        } else {
          // Insert the new user
          pool.query(
            'INSERT INTO users (username, password) VALUES (?, ?)',
            [username, password],
            (err, results) => {
              if (err) {
                console.error('Error inserting new user:', err);
                res.status(500).send('Internal Server Error');
              } else {
                res.json({ success: true, message: 'Sign up successful!' }); // Send JSON response
              }
            }
          );
        }
      }
    });
  });

  app.post('/login', (req, res) => {
    const { username, password } = req.body;
  
    pool.query(
      'SELECT * FROM users WHERE username = ? AND password = ?',
      [username, password],
      (err, results) => {
        if (err) {
          console.error('Error executing query:', err);
          res.status(500).send('Internal Server Error');
        } else {
          if (results.length > 0) {

            res.json({ success: true, username: results[0].username });
          } else {
            res.status(401).send('Invalid username or password');
          }
        }
      }
    );
  });

  app.get('/get-friends', (req, res) => {
    const currentUsername = req.query.username; // Assuming you're passing the username as a query parameter
  
    pool.query(
      'SELECT friend FROM friends WHERE username = ?',
      [currentUsername],
      (err, results) => {
        if (err) {
          console.error('Error fetching friends:', err);
          return res.status(500).send('Internal Server Error');
        }
  
        const friendsList = results.map(row => row.friend);
        res.json({ friendsList }); // Send the friends list as JSON
      }
    );
  });

  app.post('/add-friend', (req, res) => {
    const { currentUsername, userToAdd } = req.body;
  
    // 1. Validate the input
    if (!currentUsername || !userToAdd) {
      return res.status(400).send('Invalid request. Please provide both usernames.');
    }
  
    // 2. Check if the user to add exists in the database
    pool.query('SELECT * FROM users WHERE username = ?', [userToAdd], (err, results) => {
      if (err) {
        console.error('Error checking for user:', err);
        return res.status(500).send('Internal Server Error');
      }
  
      if (results.length === 0) {
        return res.status(404).send('User not found');
      }
  
      // 3. Check if they are already friends
      pool.query(
        'SELECT * FROM friends WHERE (username = ? AND friend = ?) OR (username = ? AND friend = ?)',
        [currentUsername, userToAdd, userToAdd, currentUsername],
        (err, results) => {
          if (err) {
            console.error('Error checking for existing friendship:', err);
            return res.status(500).send('Internal Server Error');
          }
  
          if (results.length > 0) {
            // They are already friends
            return res.status(400).send('You are already friends with this user');
          } else {
            // 4. Insert the friend relationship into the database
            pool.query(
              'INSERT INTO friends (username, friend) VALUES (?, ?), (?, ?)',
              [currentUsername, userToAdd, userToAdd, currentUsername],
              (err, results) => {
                if (err) {
                  console.error('Error adding friend:', err);
                  return res.status(500).send('Internal Server Error');
                } else {
                  res.send('Friend added successfully!');
                  // You might want to update the friends list in the client's localStorage here
                }
              }
            );
          }
        }
      );
    });
  });

  app.get('/chat', (req, res) => {
    const currentUser = req.query.currentUser;
    const targetUser = req.query.targetUser;
  
    pool.promise().query(`
      SELECT sender_id AS sender, recipient_id, content, timestamp FROM messages 
      WHERE (sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?) 
      ORDER BY timestamp ASC
    `, [currentUser, targetUser, targetUser, currentUser])
      .then(([rows]) => {
        const chatHistory = rows;
        res.json({ currentUser, targetUser, chatHistory });
      })
      .catch(error => {
        console.error('Error in chat route:', error);
        res.status(500).send('Internal Server Error');
      });
  });

  app.post('/send-message', async (req, res) => {
    const { sender, recipient, content } = req.body;
  
    // 1. Validate the input
    if (!sender || !recipient || !content) {
      return res.status(400).send('Invalid request. Please provide sender, recipient, and content.');
    }
  
    try {
      // 2. Store the message in your database
      const [result] = await pool.promise().query(`
        INSERT INTO messages (sender_id, recipient_id, content, timestamp)
        VALUES (?, ?, ?, NOW())
    `, [sender, recipient, content]);
  
      // 3. If you're using real-time updates, broadcast the new message to the recipient
      // (Implementation for this will depend on your real-time technology, e.g., WebSockets or SSE)
      const newMessageId = result.insertId;
      const chatId = getChatId(sender, recipient);
    broadcastNewMessage(chatId, { 
        id: newMessageId, // Assuming your database insert returns the new message ID
        sender, 
        recipient, 
        content, 
        timestamp: new Date() // Or get the timestamp from the database if available
    });
      res.sendStatus(200); // Send a success response
    } catch (error) {
      console.error('Error sending message:', error);
      res.status(500).send('Internal Server Error');
    }
  });

  app.get('/chat-updates', (req, res) => {
    const currentUser = req.query.currentUser;
    const targetUser = req.query.targetUser;

    // Set headers for SSE
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    });

    // Function to send new messages to the client
    const sendNewMessages = (newMessages) => {
        res.write(`data: ${JSON.stringify(newMessages)}\n\n`);
    };

    // Subscribe to new messages for this chat (implementation depends on your database/messaging system)
    subscribeToNewMessages(currentUser, targetUser, sendNewMessages);

    // Keep the connection open
    req.on('close', () => {
        // Unsubscribe from new messages when the client disconnects
        unsubscribeFromNewMessages(currentUser, targetUser, sendNewMessages);
    });
});
const activeSubscriptions = {};

function subscribeToNewMessages(currentUser, targetUser, sendNewMessages) {
  const chatId = getChatId(currentUser, targetUser);

  if (!activeSubscriptions[chatId]) {
      activeSubscriptions[chatId] = [];
  }

  activeSubscriptions[chatId].push(sendNewMessages);
}
  
  function unsubscribeFromNewMessages(currentUser, targetUser, sendNewMessages) {
      const chatId = getChatId(currentUser, targetUser);

      // Remove the sendNewMessages function from the list of subscribers for this chat
      if (activeSubscriptions[chatId]) {
          activeSubscriptions[chatId] = activeSubscriptions[chatId].filter(subscriber => subscriber !== sendNewMessages);
      }
  }
  function broadcastNewMessage(chatId, newMessage) {
      if (activeSubscriptions[chatId]) {
          activeSubscriptions[chatId].forEach(subscriber => subscriber([newMessage])); // Send as an array
      }
  }

  function getChatId(currentUser, targetUser) {
      // Sort the usernames alphabetically to ensure a consistent chat ID
      const sortedUsers = [currentUser, targetUser].sort();
      return sortedUsers.join('-'); // Simple concatenation for chat ID
  }

async function getNewMessagesFromDatabase(chatId, lastMessageId = 0) { // Default to 0 if not provided
  const [users] = chatId.split('-');

  try {
      const [rows] = await pool.promise().query(`
          SELECT id, sender_id AS sender, recipient_id, content, timestamp FROM messages 
          WHERE 
              ((sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?))
              AND id > ?  -- Filter by last message ID 
          ORDER BY timestamp ASC
      `, [users[0], users[1], users[1], users[0], lastMessageId]);

      return rows;
  } catch (error) {
      console.error('Error fetching new messages:', error);
      throw error; 
  }
}


  app.get('/homescreen.html', (req, res) => {
    // Get the current username from somewhere (e.g., session, token, etc.)
    // For this example, let's assume it's in a query parameter: /homescreen.html?username=john
    const currentUsername = req.query.username;
  
    // Fetch the list of friends for the current user
    pool.query(
      'SELECT friend FROM friends WHERE username = ?',
      [currentUsername],
      (err, results) => {
        if (err) {
          console.error('Error fetching friends:', err);
          return res.status(500).send('Internal Server Error');
        }
  
        const friendsList = results.map(row => row.friend); // Extract friend usernames from the results
  
        // Send the friends list along with the HTML file
        res.sendFile(path.join(__dirname, 'homescreen.html'), {
          friendsList: JSON.stringify(friendsList) // Pass the friends list as a JSON string
        });
      }
    );
  });

  

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);   

});

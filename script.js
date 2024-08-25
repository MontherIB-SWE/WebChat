const signupForm = document.getElementById('sign-up-form');

signupForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const username = signupForm.querySelector('input[name="username"]').value;
  const password = signupForm.querySelector('input[name="password"]').value;

  fetch('/signup', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ username, password })
  }).then(response => {
    if (!response.ok) {
      // Handle errors as before
      return response.json().then(data => {
        throw new Error(data.message || 'Sign up failed'); 
      });
    } else {
      // If successful, just return the response text
      return response.text();
    }
  }).then(message => {
      alert(message); // Display the success message directly
    showSignInForm();
  }).catch(error => {
    console.error('Signup error:', error); // Log the full error object for debugging
    alert(error.message || 'An unexpected error occurred during signup.'); // Display a more user-friendly message
  
  });
});


const loginForm = document.getElementById('sign-in-form');

loginForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const username = loginForm.querySelector('input[name="username"]').value;
  const password = loginForm.querySelector('input[name="password"]').value;

  fetch('/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ username, password })
  })
  .then(response => {
    if (response.ok) {
      return response.json(); // Expect JSON response with session token and username
    } else {
      throw new Error('Login failed');
    }
  })
  .then(data => {
    if (data.success) {
      // Save username and token to sessionStorage (unique to each session)
      sessionStorage.setItem('username', data.username);
      sessionStorage.setItem('token', data.token); // Store session token

      // Redirect to homescreen
      window.location.href = 'homescreen.html'; 
    } else {
      alert('Login failed. Please check your credentials.');
    }
  })
  .catch(error => {
    alert(error.message);
  });
});

function showSignInForm() {
  document.getElementById('sign-in-form').style.display = 'block';
  document.getElementById('sign-up-form').style.display = 'none';
}
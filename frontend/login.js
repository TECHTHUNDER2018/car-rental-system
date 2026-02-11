document.addEventListener('DOMContentLoaded', () => {


  const loginForm = document.getElementById('login-form');
  const loginMessage = document.getElementById('login-message');
  const loginApiUrl = 'http://localhost:3000/api/login';

  loginForm.addEventListener('submit', (event) => {
    event.preventDefault();

    // 2. Grab the data from the form
    const formData = new FormData(loginForm);
    const loginData = {};
    formData.forEach((value, key) => {
      loginData[key] = value;
    });

    // 3. Send the data to the backend login API
    fetch(loginApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(loginData),
    })
    .then(response => response.json())
    .then(data => {
      // 4. Handle the response from the server
if (data.error) {
  loginMessage.textContent = `Error: ${data.error}`;
  loginMessage.style.color = 'red';
} else {
  // 1. Show success message
  loginMessage.textContent = data.message;
  loginMessage.style.color = 'green';
  loginForm.reset();
  
  // 2. NEW: Save user data to localStorage
  localStorage.setItem('currentUser', JSON.stringify(data.user));

  // 3. Welcome user and redirect
  alert(`Welcome back, ${data.user.FirstName}!`);
  window.location.href = 'index.html'; // Go back to the main page
}
    })
    .catch(error => {
      // 5. Handle any network errors
      console.error('Error during login:', error);
      loginMessage.textContent = 'A network error occurred. Please try again.';
      loginMessage.style.color = 'red';
    });
  });
});
document.addEventListener('DOMContentLoaded', () => {

  // --- Registration Form Functionality ---
  
  const registrationForm = document.getElementById('register-form'); 
  
  const registerMessage = document.getElementById('register-message');
  const registerApiUrl = 'http://localhost:3000/api/register';

  registrationForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(registrationForm);
    const registrationData = {};
    formData.forEach((value, key) => { registrationData[key] = value; });
    
    fetch(registerApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(registrationData),
    })
    .then(response => response.json())
    .then(data => {
      if (data.error) {
        registerMessage.textContent = `Error: ${data.error}`;
        registerMessage.style.color = 'red';
      } else {
        registerMessage.textContent = data.message;
        registerMessage.style.color = 'green';
        registrationForm.reset();
        alert('Registration successful! Please log in.');
        window.location.href = 'login.html'; 
      }
    })
    .catch(error => {
      console.error('Error during registration:', error);
      registerMessage.textContent = 'A network error occurred. Please try again.';
      registerMessage.style.color = 'red';
    });
  });

});
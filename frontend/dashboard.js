document.addEventListener('DOMContentLoaded', () => {

    // --- 1. Customer Security Check ---
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));

    if (!currentUser) {
        // If user is not logged in, redirect to login
        alert('Please log in to view your dashboard.');
        window.location.href = 'login.html';
        return; // Stop running the rest of the script
    }

    // --- 2. Element References ---
    const myRentalsList = document.getElementById('my-rentals-list');
    const logoutBtn = document.getElementById('logout-btn');

    // --- 3. API URL ---
    // Use the new, customer-specific API route
    const myRentalsApiUrl = `http://localhost:3000/api/rentals/customer/${currentUser.CustomerID}`; 

    // --- 4. Event Listeners ---
    logoutBtn.addEventListener('click', (event) => {
        event.preventDefault();
        localStorage.removeItem('currentUser');
        alert('You have been logged out.');
        window.location.href = 'index.html';
    });

    // --- 5. Core Function ---
    function fetchMyRentals() {
        myRentalsList.innerHTML = '<p>Fetching your rentals...</p>';

        fetch(myRentalsApiUrl) // Call the new, secure URL
            .then(response => response.json())
            .then(rentals => {
                myRentalsList.innerHTML = ''; // Clear loading message

                if (rentals.length === 0) {
                    myRentalsList.innerHTML = '<h3>You have no past or upcoming rentals.</h3>';
                    return;
                }

                // Create a table to show rentals
                const table = document.createElement('table');
                table.innerHTML = `
                    <thead>
                        <tr>
                            <th>Rental ID</th>
                            <th>Car</th>
                            <th>Pickup Date</th>
                            <th>Return Date</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                    </tbody>
                `;
                
                const tbody = table.querySelector('tbody');
                rentals.forEach(rental => {
                    const row = document.createElement('tr');
                    
                    // Format dates for readability
                    const pickup = new Date(rental.PickupDate).toLocaleString();
                    // Use actual return date if it exists, otherwise use expected
                    const ret = rental.ActualReturnDate 
                        ? new Date(rental.ActualReturnDate).toLocaleString() 
                        : new Date(rental.ExpectedReturnDate).toLocaleString();
                    
                    row.innerHTML = `
                        <td>${rental.RentalID}</td>
                        <td>${rental.Make} ${rental.Model} (${rental.Year})</td>
                        <td>${pickup}</td>
                        <td>${ret}</td>
                        <td>${rental.Status}</td>
                    `;
                    tbody.appendChild(row);
                });

                myRentalsList.appendChild(table);
            })
            .catch(error => {
                console.error('Error fetching rentals:', error);
                myRentalsList.innerHTML = '<p style="color: red;">Error loading your rentals.</p>';
            });
    }

    // --- 6. Initial Load ---
    fetchMyRentals();
});
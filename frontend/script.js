document.addEventListener('DOMContentLoaded', () => {
    let currentUser = null;

    // --- Element References ---
    const carListContainer = document.getElementById('car-list-container');
    const carSearchForm = document.getElementById('car-search-form');

    // --- API URLs ---
    const carApiUrl = 'http://localhost:3000/api/cars/available';
    const bookApiUrl = 'http://localhost:3000/api/rentals/book';


    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
        currentUser = JSON.parse(storedUser);

        // Get Navbar elements
        const navLoggedOut = document.getElementById('nav-logged-out');
        const navLoggedIn = document.getElementById('nav-logged-in');
        const userWelcome = document.getElementById('user-welcome');
        const logoutBtn = document.getElementById('logout-btn');
        
        const navAdminLink = document.getElementById('nav-admin-link'); 

        // Update standard UI
        navLoggedOut.style.display = 'none';
        navLoggedIn.style.display = 'flex';
        userWelcome.textContent = `Welcome, ${currentUser.FirstName}!`;

        if (currentUser.Role === 'Admin') {
            navAdminLink.style.display = 'inline-block'; 
        }
      

        // Add Logout Event Listener
        logoutBtn.addEventListener('click', (event) => {
            event.preventDefault();
            localStorage.removeItem('currentUser');
            alert('You have been logged out.');
            window.location.reload();
        });
    }


    // --- 2. Core Function: Fetch and Display Cars ---
    function fetchAndDisplayCars(url = carApiUrl) { 
        fetch(url, { cache: 'no-store' }) 
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(cars => {
                carListContainer.innerHTML = ''; 

                if (cars.length === 0) {
                    carListContainer.innerHTML = '<p>No available cars found matching your criteria.</p>';
                    return;
                }

                cars.forEach(car => {
                    const carCard = document.createElement('div');
                    carCard.className = 'car-card';

                    carCard.innerHTML = `
                        <h3>${car.Make} ${car.Model} (${car.Year})</h3>
                        <p><strong>Category:</strong> ${car.CategoryName}</p>
                        <p><strong>Branch:</strong> ${car.BranchName}</p>
                        <p><strong>VIN:</strong> ${car.VIN}</p>
                        <p><strong>Color:</strong> ${car.Color}</p>
                        <p class="price">$${car.DailyRentalRate} / day</p>
                        ${currentUser ?
                            `<button class="book-now-btn"
                                    data-vin="${car.VIN}"
                                    data-branchid="${car.HomeBranchID}"
                                    data-mileage="${car.CurrentMileage}">
                                Book Now
                            </button>`
                            : '<p><em><a href="login.html">Login</a> to book this car.</em></p>'}
                    `;
                    carListContainer.appendChild(carCard);
                });

                if (currentUser) {
                    addBookingListeners();
                }
            })
            .catch(error => {
                console.error('Error fetching cars:', error);
                carListContainer.innerHTML = '<p>Error loading cars. Please check the console.</p>';
            });
    }

    // --- 3. Booking Functionality ---
    function addBookingListeners() {
        const bookButtons = document.querySelectorAll('.book-now-btn');
        bookButtons.forEach(button => {
            button.addEventListener('click', (event) => {
                const carVIN = event.target.dataset.vin;
                const branchID = event.target.dataset.branchid;
                const mileage = event.target.dataset.mileage;
                const now = new Date();
                const pickupDate = now.toISOString();
                const returnDateObj = new Date(now.setDate(now.getDate() + 2)); 
                const returnDate = returnDateObj.toISOString();

                const bookingData = {
                    CustomerID: currentUser.CustomerID,
                    CarVIN: carVIN,
                    PickupDate: pickupDate,
                    ExpectedReturnDate: returnDate,
                    PickupBranchID: branchID,
                    ReturnBranchID: branchID,
                    MileageOut: mileage
                };

                fetch(bookApiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(bookingData),
                })
                .then(response => response.json())
                .then(data => {
                    if (data.error) {
                        alert(`Booking failed: ${data.error}`);
                    } else {
                        alert(`Booking successful! Your Rental ID is: ${data.rentalId}`);
                        runSearch(); 
                    }
                })
                .catch(error => {
                    console.error('Error during booking:', error);
                    alert('A network error occurred during booking.');
                });
            });
        });
    }


    // --- 4. Search Logic Driver ---
    function runSearch() {
        const pickupDate = document.getElementById('search-pickup').value;
        const returnDate = document.getElementById('search-return').value;

        const location = document.getElementById('search-location').value;
        const params = new URLSearchParams();

        if (pickupDate && returnDate) {
            params.append('pickup', pickupDate);
            params.append('return', returnDate);
        }
        if (location) {
            params.append('location', location);
        }
        
        let url = carApiUrl;
        const queryString = params.toString();
        if (queryString) {
            url += `?${queryString}`;
        }
        fetchAndDisplayCars(url);
    }

    // --- 5. Event Listeners ---
    carSearchForm.addEventListener('submit', (event) => {
        event.preventDefault();
        runSearch();
    });
    runSearch();

});
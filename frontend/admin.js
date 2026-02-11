document.addEventListener('DOMContentLoaded', () => {

    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser || currentUser.Role !== 'Admin') {
        alert('You do not have permission to access this page.');
        window.location.href = 'index.html';
        return; 
    }

    const logoutBtn = document.getElementById('logout-btn');
    const sidebarLinks = document.querySelectorAll('.admin-sidebar .nav-link');
    const pages = document.querySelectorAll('.admin-page');
    const statRevenue = document.getElementById('stat-total-revenue');
    const statActive = document.getElementById('stat-active-rentals');
    const statUsers = document.getElementById('stat-total-users');
    const statCars = document.getElementById('stat-cars-available');
    const statOverdue = document.getElementById('stat-overdue-rentals');
    const statMaintenance = document.getElementById('stat-maintenance-cars');
    const statToday = document.getElementById('stat-bookings-today');
    const recentRentalsContainer = document.getElementById('recent-rentals-container');
    const chartCanvas = document.getElementById('carStatusChart').getContext('2d');
    let carStatusChart = null; 

    // Page: User Management
    const userListContainer = document.getElementById('user-list-container');
    const userModal = document.getElementById('edit-user-modal');
    const userModalCloseBtn = userModal.querySelector('.modal-close-btn');
    const editUserForm = document.getElementById('edit-user-form');
    let allUsersData = []; 

    // Page: Rental Management
    const activeRentalsList = document.getElementById('active-rentals-list');

    // Page: Car Management
    const carListContainer = document.getElementById('car-list-container');
    const addCarBtn = document.getElementById('add-car-btn');
    const carModal = document.getElementById('car-modal');
    const carModalCloseBtn = carModal.querySelector('.modal-close-btn');
    const carForm = document.getElementById('car-form');
    const carModalTitle = document.getElementById('car-modal-title');
    let allCarsData = []; // Cache for car data

    // --- 3. API URLs ---
    const overviewApiUrl = 'http://localhost:3000/api/admin/overview';
    const usersApiUrl = 'http://localhost:3000/api/admin/users';
    const activeRentalsApiUrl = 'http://localhost:3000/api/rentals/active';
    const returnApiUrl = 'http://localhost:3000/api/rentals/return';
    const carsApiUrl = 'http://localhost:3000/api/admin/cars';
    const categoriesApiUrl = 'http://localhost:3000/api/admin/categories';
    const branchesApiUrl = 'http://localhost:3000/api/admin/branches';


    // --- 4. Navigation Logic ---
    sidebarLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            if (e.currentTarget.dataset.page) {
                e.preventDefault();
                const targetPage = e.currentTarget.dataset.page; 

                sidebarLinks.forEach(l => l.classList.remove('active'));
                e.currentTarget.classList.add('active');

                pages.forEach(page => {
                    page.classList.toggle('active-page', page.id === `page-${targetPage}`);
                });

                // Load data for the specific page
                if (targetPage === 'overview') fetchOverviewData();
                if (targetPage === 'users') fetchAllUsers();
                if (targetPage === 'rentals') fetchActiveRentals();
                if (targetPage === 'cars') fetchAllCars(); 
            }
        });
    });

    // --- 5. Event Listeners ---
    logoutBtn.addEventListener('click', (event) => {
        event.preventDefault();
        localStorage.removeItem('currentUser');
        alert('You have been logged out.');
        window.location.href = 'index.html';
    });

    // User Modal Listeners
    userModalCloseBtn.addEventListener('click', () => userModal.style.display = 'none');
    window.addEventListener('click', (event) => {
        if (event.target == userModal) userModal.style.display = 'none';
    });
    editUserForm.addEventListener('submit', handleEditUserFormSubmit);
    
    // Car Modal Listeners
    addCarBtn.addEventListener('click', openCarModalForAdd);
    carModalCloseBtn.addEventListener('click', () => carModal.style.display = 'none');
    window.addEventListener('click', (event) => {
        if (event.target == carModal) carModal.style.display = 'none';
    });
    carForm.addEventListener('submit', handleCarFormSubmit);


    // --- 6. Core Data-Fetching Functions ---
    function fetchOverviewData() {
        fetch(overviewApiUrl)
            .then(res => res.json())
            .then(data => {
                statRevenue.textContent = `$${parseFloat(data.stats.totalRevenue).toFixed(2)}`;
                statActive.textContent = data.stats.activeRentals;
                statUsers.textContent = data.stats.totalUsers;
                statCars.textContent = data.stats.carsAvailable;
                statOverdue.textContent = data.stats.overdueRentals;
                statMaintenance.textContent = data.stats.maintenanceCars;
                statToday.textContent = data.stats.bookingsToday;
                renderRecentRentals(data.recentRentals);
                renderCarStatusChart(data.chartData);
            })
            .catch(err => console.error("Error fetching stats:", err));
    }
    
    function renderRecentRentals(rentals) {
        if (!rentals || rentals.length === 0) {
            recentRentalsContainer.innerHTML = '<p>No recent rentals.</p>';
            return;
        }
        const table = document.createElement('table');
        table.innerHTML = `
            <thead>
                <tr>
                    <th style="width: 15%;">ID</th>
                    <th style="width: 30%;">Customer</th>
                    <th style="width: 30%;">Car</th>
                    <th style="width: 25%;">Status</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
        const tbody = table.querySelector('tbody');
        rentals.forEach(rental => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${rental.RentalID}</td>
                <td>${rental.FirstName} ${rental.LastName}</td>
                <td>${rental.Make} ${rental.Model}</td>
                <td>${rental.Status}</td>
            `;
            tbody.appendChild(row);
        });
        recentRentalsContainer.innerHTML = '';
        recentRentalsContainer.appendChild(table);
    }
    
    function renderCarStatusChart(chartData) {
        const labels = chartData.map(item => item.Status);
        const data = chartData.map(item => item.count);
        const backgroundColors = labels.map(label => {
            if (label === 'Available') return 'rgba(40, 167, 69, 0.7)'; // Green
            if (label === 'Rented') return 'rgba(0, 123, 255, 0.7)'; // Blue
            if (label === 'Under Maintenance') return 'rgba(108, 117, 125, 0.7)'; // Grey
            return 'rgba(255, 193, 7, 0.7)'; 
        });

        if (carStatusChart) carStatusChart.destroy();
        carStatusChart = new Chart(chartCanvas, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Car Fleet Status',
                    data: data,
                    backgroundColor: backgroundColors,
                    borderColor: '#ffffff',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { position: 'top' } }
            }
        });
    }

    // --- USER MANAGEMENT ---
    function fetchAllUsers() {
        userListContainer.innerHTML = '<p>Fetching users...</p>';
        fetch(usersApiUrl)
            .then(response => response.json())
            .then(users => {
                allUsersData = users; 
                renderUserTable(users);
            })
            .catch(error => {
                userListContainer.innerHTML = '<p style="color: red;">Error fetching users.</p>';
            });
    }

    function renderUserTable(users) {
        if (users.length === 0) {
            userListContainer.innerHTML = '<p>No users found.</p>';
            return;
        }
        const table = document.createElement('table');
        table.innerHTML = `
            <thead>
                <tr>
                    <th style="width: 5%;">ID</th>
                    <th style="width: 15%;">First Name</th>
                    <th style="width: 15%;">Last Name</th>
                    <th style="width: 25%;">Email</th>
                    <th style="width: 10%;">Role</th>
                    <th style="width: 15%;">License #</th>
                    <th style="width: 15%;">Action</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
        const tbody = table.querySelector('tbody');
        users.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user.CustomerID}</td>
                <td>${user.FirstName}</td>
                <td>${user.LastName}</td>
                <td>${user.Email}</td>
                <td>${user.Role}</td>
                <td>${user.DriversLicenseNumber}</td>
                <td>
                    <button class="admin-edit-btn" data-id="${user.CustomerID}">Edit</button>
                    <button class="admin-delete-btn" data-id="${user.CustomerID}">Delete</button>
                </td>
            `;
            tbody.appendChild(row);
        });
        userListContainer.innerHTML = ''; 
        userListContainer.appendChild(table);
        addUserTableListeners();
    }

    function addUserTableListeners() {
        document.querySelectorAll('.admin-delete-btn').forEach(button => {
            button.addEventListener('click', (event) => {
                const id = event.target.dataset.id;
                if (confirm(`Are you sure you want to delete user ${id}? This cannot be undone.`)) {
                    deleteUser(id);
                }
            });
        });

        document.querySelectorAll('.admin-edit-btn').forEach(button => {
            button.addEventListener('click', (event) => {
                const id = event.target.dataset.id;
                const userToEdit = allUsersData.find(user => user.CustomerID == id);
                if (userToEdit) {
                    editUserForm.reset();
                    document.getElementById('edit-userid').value = userToEdit.CustomerID;
                    document.getElementById('edit-firstname').value = userToEdit.FirstName;
                    document.getElementById('edit-lastname').value = userToEdit.LastName;
                    document.getElementById('edit-email').value = userToEdit.Email;
                    document.getElementById('edit-license').value = userToEdit.DriversLicenseNumber;
                    document.getElementById('edit-role').value = userToEdit.Role;
                    userModal.style.display = 'flex';
                }
            });
        });
    }

    function deleteUser(id) {
        fetch(`${usersApiUrl}/${id}`, { method: 'DELETE' })
            .then(response => response.json())
            .then(data => {
                if (data.error) alert(`Error: ${data.error}`);
                else alert(data.message);
                fetchAllUsers();
            })
            .catch(error => console.error('Error deleting user:', error));
    }

    function handleEditUserFormSubmit(event) {
        event.preventDefault();
        const id = document.getElementById('edit-userid').value;
        const formData = new FormData(editUserForm);
        const updatedData = {};
        formData.forEach((value, key) => { updatedData[key] = value; });

        fetch(`${usersApiUrl}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) alert(`Error: ${data.error}`);
            else alert(data.message);
            userModal.style.display = 'none';
            fetchAllUsers();
        })
        .catch(error => console.error('Error updating user:', error));
    }

    // --- RENTAL MANAGEMENT ---
    function fetchActiveRentals() {
        activeRentalsList.innerHTML = '<p>Fetching rentals...</p>';
        fetch(activeRentalsApiUrl)
            .then(response => response.json())
            .then(rentals => {
                renderRentalTable(rentals);
            })
            .catch(error => {
                activeRentalsList.innerHTML = '<p style="color: red;">Error loading rentals.</p>';
            });
    }

    function renderRentalTable(rentals) {
        if (rentals.length === 0) {
            activeRentalsList.innerHTML = '<p>No active rentals found.</p>';
            return;
        }
        const table = document.createElement('table');
        // Add widths to rental table
        table.innerHTML = `
            <thead>
                <tr>
                    <th style="width: 10%;">Rental ID</th>
                    <th style="width: 20%;">Customer</th>
                    <th style="width: 20%;">Car</th>
                    <th style="width: 25%;">Expected Return</th>
                    <th style="width: 25%;">Action</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
        const tbody = table.querySelector('tbody');
        rentals.forEach(rental => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${rental.RentalID}</td>
                <td>${rental.FirstName} ${rental.LastName}</td>
                <td>${rental.Make} ${rental.Model}</td>
                <td>${new Date(rental.ExpectedReturnDate).toLocaleString()}</td>
                <td>
                    <button class="return-btn" 
                            data-rentalid="${rental.RentalID}" 
                            data-carvin="${rental.CarVIN}">
                        Process Return
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
        activeRentalsList.innerHTML = '';
        activeRentalsList.appendChild(table);
        addReturnListeners();
    }

    function addReturnListeners() {
        document.querySelectorAll('.return-btn').forEach(button => {
            button.addEventListener('click', (event) => {
                const rentalID = event.target.dataset.rentalid;
                const carVIN = event.target.dataset.carvin;
                let mileageIn = prompt(`Enter ending mileage for ${carVIN}:`);
                if (mileageIn === null) return;
                while (isNaN(parseInt(mileageIn)) || mileageIn.trim() === '') {
                    alert('Invalid mileage. Please enter a valid number.');
                    mileageIn = prompt(`Enter ending mileage for ${carVIN}:`);
                    if (mileageIn === null) return;
                }
                let totalCost = prompt(`Enter total cost for Rental ID ${rentalID}:`);
                if (totalCost === null) return;
                while (isNaN(parseFloat(totalCost)) || totalCost.trim() === '') {
                    alert('Invalid cost. Please enter a valid number (e.g., 150.50).');
                    totalCost = prompt(`Enter total cost for Rental ID ${rentalID}:`);
                    if (totalCost === null) return;
                }
                const returnData = {
                    MileageIn: parseInt(mileageIn), 
                    TotalCost: parseFloat(totalCost), 
                    CarVIN: carVIN
                };
                fetch(`${returnApiUrl}/${rentalID}`, { 
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(returnData),
                })
                .then(response => response.json())
                .then(data => {
                    if (data.error) alert(`Return failed: ${data.error}`);
                    else alert(data.message); 
                    fetchActiveRentals(); 
                })
                .catch(error => {
                    console.error('Error processing return:', error);
                });
            });
        });
    }

    // --- 7. CAR MANAGEMENT Functions ---
    
    function fetchAllCars() {
        carListContainer.innerHTML = '<p>Fetching car fleet...</p>';
        fetch(carsApiUrl)
            .then(res => res.json())
            .then(cars => {
                allCarsData = cars; // Cache for editing
                renderCarTable(cars);
            })
            .catch(err => {
                carListContainer.innerHTML = '<p style="color: red;">Error fetching cars.</p>';
            });
    }

    function renderCarTable(cars) {
        if (cars.length === 0) {
            carListContainer.innerHTML = '<p>No cars found in fleet.</p>';
            return;
        }
        const table = document.createElement('table');
      
        table.innerHTML = `
            <thead>
                <tr>
                    <th style="width: 20%;">VIN</th>
                    <th style="width: 15%;">Make</th>
                    <th style="width: 15%;">Model</th>
                    <th style="width: 10%;">Year</th>
                    <th style="width: 15%;">Status</th>
                    <th style="width: 15%;">Branch</th>
                    <th style="width: 10%;">Action</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
        const tbody = table.querySelector('tbody');
        cars.forEach(car => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${car.VIN}</td>
                <td>${car.Make}</td>
                <td>${car.Model}</td>
                <td>${car.Year}</td>
                <td>${car.Status}</td>
                <td>${car.BranchName}</td>
                <td>
                    <button class="admin-edit-btn" data-vin="${car.VIN}">Edit</button>
                </td>
            `;
            tbody.appendChild(row);
        });
        carListContainer.innerHTML = '';
        carListContainer.appendChild(table);
        addCarTableListeners();
    }
    
    function addCarTableListeners() {
        document.querySelectorAll('#page-cars .admin-edit-btn').forEach(button => {
            button.addEventListener('click', (event) => {
                const vin = event.target.dataset.vin;
                const carToEdit = allCarsData.find(car => car.VIN === vin);
                if (carToEdit) {
                    openCarModalForEdit(carToEdit);
                }
            });
        });
    }
    
    // --- Car Modal Functions ---

    function openCarModalForAdd() {
        carModalTitle.textContent = 'Add New Car';
        carForm.reset();
        document.getElementById('car-vin-original').value = ''; 
        document.getElementById('car-vin').disabled = false;
        carModal.style.display = 'flex';
    }

    function openCarModalForEdit(car) {
        carModalTitle.textContent = `Edit Car: ${car.VIN}`;
        carForm.reset();
        
        document.getElementById('car-vin-original').value = car.VIN;
        
        document.getElementById('car-vin').value = car.VIN;
        document.getElementById('car-vin').disabled = true; // Don't allow editing VIN
        document.getElementById('car-year').value = car.Year;
        document.getElementById('car-make').value = car.Make;
        document.getElementById('car-model').value = car.Model;
        document.getElementById('car-color').value = car.Color;
        document.getElementById('car-mileage').value = car.CurrentMileage;
        document.getElementById('car-category').value = car.CategoryID;
        document.getElementById('car-branch').value = car.HomeBranchID;
        document.getElementById('car-status').value = car.Status;

        carModal.style.display = 'flex';
    }

    function handleCarFormSubmit(event) {
        event.preventDefault();
        const formData = new FormData(carForm);
        const carData = {};
        formData.forEach((value, key) => { carData[key] = value });
        
        const originalVIN = document.getElementById('car-vin-original').value;
        
        let url = carsApiUrl;
        let method = 'POST';

        if (originalVIN) {
            url = `${carsApiUrl}/${originalVIN}`;
            method = 'PUT';
           
            carData.VIN = originalVIN; 
        } else {
           
            carData.VIN = document.getElementById('car-vin').value;
        }

        fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(carData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert(`Error: ${data.error}`);
            } else {
                alert(data.message);
                carModal.style.display = 'none';
                fetchAllCars(); // Refresh the car list
            }
        })
        .catch(err => {
            console.error('Error saving car:', err);
            alert('A network error occurred.');
        });
    }

    // --- 8. Initial Load ---
    function loadDropdownData() {
        const categorySelect = document.getElementById('car-category');
        const branchSelect = document.getElementById('car-branch');

        // Fetch Categories
        fetch(categoriesApiUrl)
            .then(res => res.json())
            .then(categories => {
                categorySelect.innerHTML = ''; // Clear
                categories.forEach(cat => {
                    const option = document.createElement('option');
                    option.value = cat.CategoryID;
                    option.textContent = cat.CategoryName;
                    categorySelect.appendChild(option);
                });
            });
        
        // Fetch Branches
        fetch(branchesApiUrl)
            .then(res => res.json())
            .then(branches => {
                branchSelect.innerHTML = ''; // Clear
                branches.forEach(branch => {
                    const option = document.createElement('option');
                    option.value = branch.BranchID;
                    option.textContent = branch.BranchName;
                    branchSelect.appendChild(option);
                });
            });
    }

    fetchOverviewData();
    loadDropdownData(); 

});
# 🚗 Car Rental System - Velocity Rentals

A comprehensive full-stack web application for managing car rental operations. This system provides a complete solution for customers to browse and book rental cars, while offering administrators powerful tools to manage vehicles, users, and rentals.

## 📋 Table of Contents

- [Features](#features)
- [Technology Stack](#technology-stack)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [Database Configuration](#database-configuration)
- [Running the Application](#running-the-application)
- [Project Structure](#project-structure)
- [API Endpoints](#api-endpoints)
- [Usage Guide](#usage-guide)
- [Security Features](#security-features)
- [Contributing](#contributing)

## ✨ Features

### Customer Features
- **User Registration & Authentication**: Secure account creation with encrypted password storage
- **Car Search & Availability**: Search available cars by location, pickup/return dates
- **Rental Booking**: Book cars with automatic availability checking
- **Personal Dashboard**: View rental history and current bookings
- **Real-time Pricing**: Dynamic pricing based on car category and rental duration

### Admin Features
- **Admin Dashboard**: Comprehensive overview with key metrics and statistics
  - Total revenue tracking
  - Active rentals count
  - User statistics
  - Available cars count
  - Overdue rentals monitoring
  - Cars under maintenance tracking
  - Today's bookings
- **User Management**: 
  - View all registered users
  - Edit user information
  - Delete users with cascading record removal
  - Role-based access control (Admin/Customer)
- **Car Management**:
  - Add new vehicles to the fleet
  - Update car information and status
  - View all cars with categories and branch assignments
  - Track car status (Available, Rented, Under Maintenance)
- **Rental Management**:
  - View active rentals
  - Process car returns
  - Update rental status
  - Manage rental transactions
- **Analytics & Reporting**:
  - Live feed of recent activities
  - Car status distribution charts
  - Revenue and booking statistics

### General Features
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Role-Based Access**: Separate interfaces for customers and administrators
- **Transaction Management**: Database transactions for data integrity
- **Real-time Updates**: Dynamic content loading without page refreshes
- **Secure Authentication**: Password hashing with bcrypt
- **Database Pooling**: Efficient connection management with MySQL connection pooling

## 🛠 Technology Stack

### Backend
- **Node.js**: JavaScript runtime environment
- **Express.js**: Web application framework (v5.1.0)
- **MySQL2**: MySQL database driver with promise support
- **bcryptjs**: Password hashing library for secure authentication
- **cors**: Cross-Origin Resource Sharing middleware
- **dotenv**: Environment variable management
- **Nodemon**: Development server with auto-restart (dev dependency)

### Frontend
- **HTML5**: Semantic markup
- **CSS3**: Modern styling with responsive design
- **Vanilla JavaScript**: No framework dependencies for lightweight performance
- **Font Awesome**: Icon library for UI enhancements

### Database
- **MySQL**: Relational database management system

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v14.0.0 or higher)
- **npm** (v6.0.0 or higher)
- **MySQL** (v8.0 or higher)
- **Git** (for cloning the repository)

You can verify your installations by running:

```bash
node --version
npm --version
mysql --version
git --version
```

## 🚀 Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/TECHTHUNDER2018/car-rental-system.git
cd car-rental-system
```

### 2. Install Backend Dependencies

```bash
cd backend
npm install
```

This will install all required dependencies:
- express
- mysql2
- bcryptjs
- cors
- dotenv
- nodemon (dev dependency)

### 3. Set Up Environment Variables

Create a `.env` file in the `backend` directory:

```bash
cd backend
touch .env
```

Add the following configuration to `.env`:

```env
# Database Configuration
DB_HOST=localhost
DB_USER=your_mysql_username
DB_PASSWORD=your_mysql_password
DB_NAME=car_rental_db

# Server Configuration (Optional)
PORT=3000
```

Replace `your_mysql_username` and `your_mysql_password` with your MySQL credentials.

## 💾 Database Configuration

### 1. Create the Database

Log into MySQL:

```bash
mysql -u root -p
```

Create the database:

```sql
CREATE DATABASE car_rental_db;
USE car_rental_db;
```

### 2. Create Database Schema

Execute the following SQL to create all required tables:

```sql
-- Create Branch table
CREATE TABLE Branch (
    BranchID INT PRIMARY KEY AUTO_INCREMENT,
    BranchName VARCHAR(100) NOT NULL,
    Address VARCHAR(255),
    City VARCHAR(100),
    State VARCHAR(50),
    ZipCode VARCHAR(20),
    PhoneNumber VARCHAR(20)
);

-- Create CarCategory table
CREATE TABLE CarCategory (
    CategoryID INT PRIMARY KEY AUTO_INCREMENT,
    CategoryName VARCHAR(50) NOT NULL,
    DailyRentalRate DECIMAL(10, 2) NOT NULL,
    Description TEXT
);

-- Create Car table
CREATE TABLE Car (
    VIN VARCHAR(17) PRIMARY KEY,
    Make VARCHAR(50) NOT NULL,
    Model VARCHAR(50) NOT NULL,
    Year INT NOT NULL,
    Color VARCHAR(30),
    CurrentMileage INT,
    Status ENUM('Available', 'Rented', 'Under Maintenance') DEFAULT 'Available',
    CategoryID INT,
    HomeBranchID INT,
    FOREIGN KEY (CategoryID) REFERENCES CarCategory(CategoryID),
    FOREIGN KEY (HomeBranchID) REFERENCES Branch(BranchID)
);

-- Create Customer table
CREATE TABLE Customer (
    CustomerID INT PRIMARY KEY AUTO_INCREMENT,
    FirstName VARCHAR(50) NOT NULL,
    LastName VARCHAR(50) NOT NULL,
    Email VARCHAR(100) UNIQUE NOT NULL,
    PhoneNumber VARCHAR(20),
    DriversLicenseNumber VARCHAR(50) UNIQUE NOT NULL,
    DateOfBirth DATE,
    Address VARCHAR(255),
    City VARCHAR(100),
    State VARCHAR(50),
    ZipCode VARCHAR(20),
    PasswordHash VARCHAR(255) NOT NULL,
    Role ENUM('Customer', 'Admin') DEFAULT 'Customer',
    RegistrationDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Rental table
CREATE TABLE Rental (
    RentalID INT PRIMARY KEY AUTO_INCREMENT,
    CustomerID INT NOT NULL,
    CarVIN VARCHAR(17) NOT NULL,
    PickupDate DATE NOT NULL,
    ExpectedReturnDate DATE NOT NULL,
    ActualReturnDate DATE,
    PickupBranchID INT,
    ReturnBranchID INT,
    MileageOut INT,
    MileageIn INT,
    TotalCost DECIMAL(10, 2),
    Status ENUM('Booked', 'Active', 'Completed', 'Cancelled') DEFAULT 'Booked',
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (CustomerID) REFERENCES Customer(CustomerID),
    FOREIGN KEY (CarVIN) REFERENCES Car(VIN),
    FOREIGN KEY (PickupBranchID) REFERENCES Branch(BranchID),
    FOREIGN KEY (ReturnBranchID) REFERENCES Branch(BranchID)
);

-- Create Payment table
CREATE TABLE Payment (
    PaymentID INT PRIMARY KEY AUTO_INCREMENT,
    RentalID INT NOT NULL,
    PaymentDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    Amount DECIMAL(10, 2) NOT NULL,
    PaymentMethod ENUM('Credit Card', 'Debit Card', 'Cash', 'Online') NOT NULL,
    TransactionID VARCHAR(100),
    FOREIGN KEY (RentalID) REFERENCES Rental(RentalID)
);
```

### 3. Insert Sample Data (Optional)

```sql
-- Insert sample branches
INSERT INTO Branch (BranchName, Address, City, State, ZipCode, PhoneNumber) VALUES
('Downtown Branch', '123 Main St', 'New York', 'NY', '10001', '555-0101'),
('Airport Branch', '456 Airport Rd', 'Los Angeles', 'CA', '90001', '555-0102'),
('Suburban Branch', '789 Oak Ave', 'Chicago', 'IL', '60601', '555-0103');

-- Insert sample car categories
INSERT INTO CarCategory (CategoryName, DailyRentalRate, Description) VALUES
('Economy', 35.00, 'Fuel-efficient compact cars'),
('Sedan', 50.00, 'Comfortable mid-size vehicles'),
('SUV', 75.00, 'Spacious sport utility vehicles'),
('Luxury', 120.00, 'Premium high-end vehicles');

-- Insert sample cars
INSERT INTO Car (VIN, Make, Model, Year, Color, CurrentMileage, Status, CategoryID, HomeBranchID) VALUES
('1HGBH41JXMN109186', 'Honda', 'Civic', 2022, 'Blue', 15000, 'Available', 1, 1),
('2HGFG12657H542391', 'Toyota', 'Camry', 2023, 'Silver', 8000, 'Available', 2, 1),
('5UXWX7C53F0E41234', 'BMW', 'X5', 2023, 'Black', 12000, 'Available', 3, 2),
('WBADW3C57DJ234567', 'Mercedes', 'S-Class', 2024, 'White', 5000, 'Available', 4, 2);

-- Insert sample admin user (password: admin123)
INSERT INTO Customer (FirstName, LastName, Email, PhoneNumber, DriversLicenseNumber, DateOfBirth, Address, City, State, ZipCode, PasswordHash, Role) VALUES
('Admin', 'User', 'admin@velocityrentals.com', '555-0100', 'ADMIN001', '1990-01-01', '123 Admin St', 'New York', 'NY', '10001', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin');
```

**Note**: The sample admin password is `admin123`. You should change this immediately after first login.

## 🏃‍♂️ Running the Application

### Start the Backend Server

From the `backend` directory:

```bash
# Development mode with auto-restart
npm run dev

# Or production mode
node server.js
```

The server will start on `http://localhost:3000`

You should see:
```
Server is running on http://localhost:3000
Successfully connected to MySQL database pool.
```

### Access the Frontend

Open the frontend application:

1. Navigate to the `frontend` directory in your file explorer
2. Open `index.html` in your web browser

Or use a simple HTTP server:

```bash
cd frontend
# Using Python 3
python -m http.server 8080

# Or using Node.js
npx http-server -p 8080
```

Then visit `http://localhost:8080` in your browser.

### Accessing Different Pages

- **Home Page**: `index.html` - Search and browse available cars
- **Login**: `login.html` - User authentication
- **Register**: `register.html` - Create new account
- **Customer Dashboard**: `dashboard.html` - View rental history (requires login)
- **Admin Dashboard**: `admin.html` - Manage users, cars, and rentals (requires admin role)

## 📁 Project Structure

```
car-rental-system/
├── backend/
│   ├── config/
│   │   └── db.js                 # Database connection configuration
│   ├── routes/
│   │   └── apiRoutes.js          # API endpoint definitions
│   ├── node_modules/             # Backend dependencies
│   ├── .env                      # Environment variables (not in repo)
│   ├── .gitignore                # Git ignore file
│   ├── package.json              # Backend dependencies and scripts
│   ├── package-lock.json         # Lock file for dependencies
│   └── server.js                 # Express server entry point
│
├── frontend/
│   ├── images/                   # Image assets
│   ├── admin.html                # Admin dashboard page
│   ├── admin.js                  # Admin dashboard JavaScript
│   ├── dashboard.html            # Customer dashboard page
│   ├── dashboard.js              # Customer dashboard JavaScript
│   ├── index.html                # Home page
│   ├── login.html                # Login page
│   ├── login.js                  # Login functionality
│   ├── register.html             # Registration page
│   ├── register.js               # Registration functionality
│   ├── script.js                 # Main JavaScript file
│   └── style.css                 # Global styles
│
└── README.md                     # This file
```

## 🔌 API Endpoints

### Authentication & User Management

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/register` | Register new user | No |
| POST | `/api/login` | User login | No |
| GET | `/api/admin/users` | Get all users | Admin |
| PUT | `/api/admin/users/:id` | Update user | Admin |
| DELETE | `/api/admin/users/:id` | Delete user | Admin |

### Car Management

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/cars/available` | Search available cars | No |
| GET | `/api/admin/cars` | Get all cars | Admin |
| POST | `/api/admin/cars` | Add new car | Admin |
| PUT | `/api/admin/cars/:vin` | Update car | Admin |
| GET | `/api/admin/categories` | Get car categories | Admin |
| GET | `/api/admin/branches` | Get branches | Admin |

### Rental Management

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/rentals/book` | Book a rental | Customer |
| PUT | `/api/rentals/return/:id` | Return a rental | Staff |
| GET | `/api/rentals/active` | Get active rentals | Staff |
| GET | `/api/rentals/customer/:id` | Get customer rentals | Customer |

### Analytics

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/admin/overview` | Get dashboard statistics | Admin |

### Request/Response Examples

#### Search Available Cars
```javascript
GET /api/cars/available?location=New York&pickup=2024-03-01&return=2024-03-05

Response:
[
  {
    "VIN": "1HGBH41JXMN109186",
    "Make": "Honda",
    "Model": "Civic",
    "Year": 2022,
    "Color": "Blue",
    "CurrentMileage": 15000,
    "HomeBranchID": 1,
    "CategoryName": "Economy",
    "DailyRentalRate": 35.00,
    "BranchName": "Downtown Branch"
  }
]
```

#### Book a Rental
```javascript
POST /api/rentals/book
Content-Type: application/json

{
  "CustomerID": 1,
  "CarVIN": "1HGBH41JXMN109186",
  "PickupDate": "2024-03-01",
  "ExpectedReturnDate": "2024-03-05",
  "PickupBranchID": 1,
  "ReturnBranchID": 1,
  "MileageOut": 15000
}

Response:
{
  "message": "Rental booked successfully!",
  "rentalId": 123
}
```

## 📖 Usage Guide

### For Customers

1. **Register an Account**
   - Navigate to the register page
   - Fill in all required information
   - Submit the form
   - You'll be redirected to login

2. **Search for Cars**
   - On the home page, enter your location and dates
   - Click "Search Cars" to see available vehicles
   - Browse through the results

3. **Book a Rental**
   - Click on a car to view details
   - Click "Book Now"
   - Review booking details and confirm

4. **View Your Rentals**
   - Log in to your account
   - Navigate to "Dashboard"
   - View all your past and current rentals

### For Administrators

1. **Access Admin Panel**
   - Log in with admin credentials
   - Click on "Admin" in the navigation
   - You'll see the admin dashboard

2. **Manage Users**
   - Click "User Management" in the sidebar
   - View all registered users
   - Edit or delete users as needed

3. **Manage Cars**
   - Click "Car Management" in the sidebar
   - Add new vehicles to the fleet
   - Update existing car information
   - Change car status (Available, Rented, Under Maintenance)

4. **Monitor Rentals**
   - Click "Rental Management" to view active rentals
   - Process returns and update rental status

5. **View Analytics**
   - The Overview page shows key metrics
   - Monitor revenue, active rentals, and user statistics
   - View recent activity feed

## 🔒 Security Features

- **Password Hashing**: All passwords are hashed using bcrypt before storage
- **SQL Injection Prevention**: Parameterized queries throughout the application
- **CORS Protection**: Configured CORS middleware for API security
- **Transaction Management**: Database transactions ensure data integrity
- **Role-Based Access**: Separate permissions for customers and administrators
- **Environment Variables**: Sensitive configuration stored in .env files
- **Input Validation**: Server-side validation for all user inputs

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

### Development Workflow

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is open source and available for educational purposes.

## 🐛 Troubleshooting

### Backend won't start
- Verify MySQL is running
- Check `.env` file configuration
- Ensure all npm packages are installed
- Verify port 3000 is not in use

### Cannot connect to database
- Verify MySQL credentials in `.env`
- Ensure database `car_rental_db` exists
- Check MySQL is running on the correct host/port
- Verify user has proper permissions

### Frontend not loading data
- Ensure backend server is running
- Check browser console for errors
- Verify API endpoint URLs match backend configuration
- Check CORS settings if running on different ports

## 📧 Support

For questions or support, please open an issue in the GitHub repository.

---

**Built with ❤️ using Node.js, Express, and MySQL**

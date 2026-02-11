const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcryptjs');

// ===============================================
// 1. CAR AVAILABILITY SEARCH
// ===============================================
// GET /api/cars/available
router.get('/cars/available', (req, res) => {
    const pickupDate = req.query.pickup;
    const returnDate = req.query.return;
    const location = req.query.location; 
    let sql = `
        SELECT
            C.VIN,
            C.Make,
            C.Model,
            C.Year,
            C.Color,
            C.CurrentMileage,
            C.HomeBranchID,
            CC.CategoryName,
            CC.DailyRentalRate,
            B.BranchName
        FROM
            Car AS C
        JOIN
            CarCategory AS CC ON C.CategoryID = CC.CategoryID
        JOIN
            Branch AS B ON C.HomeBranchID = B.BranchID
        WHERE
            C.Status = 'Available'
    `;
    const sqlValues = [];
    if (location) {
        
        sql += ` AND (B.BranchName LIKE ? OR B.City LIKE ?)`;
        
        sqlValues.push(`%${location}%`, `%${location}%`);
    }

    if (pickupDate && returnDate) {
        sql += `
            AND C.VIN NOT IN (
                SELECT 
                    CarVIN 
                FROM 
                    Rental 
                WHERE 
                    Status IN ('Booked', 'Active') 
                    AND (
                        (ExpectedReturnDate >= ? AND PickupDate <= ?)
                    )
            )
        `;
        
        sqlValues.push(pickupDate, returnDate);
    }
    
    sql += ` ORDER BY CC.DailyRentalRate, C.Make`; 

    db.query(sql, sqlValues, (err, results) => {
        if (err) {
            console.error('Error fetching available cars: ', err);
            res.status(500).json({ error: 'Database error' });
            return;
        }
        res.json(results);
    });
});

// ===============================================
// 2. USER REGISTRATION
// ===============================================
router.post('/register', (req, res) => {

    const { 
        FirstName, 
        LastName, 
        Email, 
        PhoneNumber, 
        DriversLicenseNumber, 
        DateOfBirth, 
        Address, 
        City, 
        State, 
        ZipCode, 
        Password 
    } = req.body;
    bcrypt.hash(Password, 10, (err, hashedPassword) => {
        if (err) {
            console.error('Error hashing password:', err);
            return res.status(500).json({ error: 'Server error' });
        }

        const sql = `
            INSERT INTO Customer (
                FirstName, LastName, Email, PhoneNumber, 
                DriversLicenseNumber, DateOfBirth, Address, 
                City, State, ZipCode, PasswordHash
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            FirstName, 
            LastName, 
            Email, 
            PhoneNumber, 
            DriversLicenseNumber, 
            DateOfBirth, 
            Address, 
            City, 
            State, 
            ZipCode, 
            hashedPassword
        ];

        db.query(sql, values, (err, result) => {
            if (err) {
                console.error('Error registering user: ', err);
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ error: 'Email or Driver\'s License already exists' });
                }
                return res.status(500).json({ error: 'Database error' });
            }

            res.status(201).json({ 
                message: 'User registered successfully!', 
                customerId: result.insertId 
            });
        });
    });
});

// ===============================================
// 3. USER LOGIN
// ===============================================
router.post('/login', (req, res) => {

    const { Email, Password } = req.body;
    const sql = "SELECT * FROM Customer WHERE Email = ?"; 

    db.query(sql, [Email], (err, results) => {
        if (err) {
            console.error('Error finding user: ', err);
            return res.status(500).json({ error: 'Database error' });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = results[0];
        const hashedPassword = user.PasswordHash;

        bcrypt.compare(Password, hashedPassword, (err, isMatch) => {
            if (err) {
                console.error('Error comparing passwords:', err);
                return res.status(500).json({ error: 'Server error' });
            }

            if (isMatch) {
                res.status(200).json({
                    message: 'Login successful!',
                    user: {
                        CustomerID: user.CustomerID,
                        FirstName: user.FirstName,
                        Email: user.Email,
                        Role: user.Role 
                    }
                });
            } else {
                res.status(401).json({ error: 'Invalid email or password' });
            }
        });
    });
});

// ===============================================
// 4. BOOK RENTAL (Create)
// ===============================================
router.post('/rentals/book', (req, res) => {

    const { 
        CustomerID, 
        CarVIN, 
        PickupDate, 
        ExpectedReturnDate, 
        PickupBranchID, 
        ReturnBranchID,
        MileageOut
    } = req.body;

    db.getConnection((err, connection) => {
        if (err) {
            console.error('Error getting database connection:', err);
            return res.status(500).json({ error: 'Database connection error' });
        }

        connection.beginTransaction(err => {
            if (err) {
                connection.release(); 
                console.error('Error starting transaction:', err);
                return res.status(500).json({ error: 'Error starting transaction' });
            }
            const rentalSQL = `INSERT INTO Rental (
                    CustomerID, CarVIN, PickupDate, ExpectedReturnDate, 
                    PickupBranchID, ReturnBranchID, MileageOut, Status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Booked')
            `;
            
            const rentalValues = [
                CustomerID, CarVIN, new Date(PickupDate), new Date(ExpectedReturnDate),
                PickupBranchID, ReturnBranchID, MileageOut
            ];

            connection.query(rentalSQL, rentalValues, (err, result) => {
                if (err) {
                    console.error('Error in rental INSERT:', err);
                    return connection.rollback(() => {
                        connection.release();
                        res.status(500).json({ error: 'Database error while booking' });
                    });
                }

                const rentalId = result.insertId;
                const updateCarSQL = "UPDATE Car SET Status = 'Rented' WHERE VIN = ?";
                
                connection.query(updateCarSQL, [CarVIN], (err, updateResult) => {
                    if (err) {
                        console.error('Error in car UPDATE:', err);
                        return connection.rollback(() => {
                            connection.release();
                            res.status(500).json({ error: 'Rental booked, but failed to update car status.' });
                        });
                    }

                    connection.commit(err => {
                        if (err) {
                            console.error('Error committing transaction:', err);
                            return connection.rollback(() => {
                                connection.release();
                                res.status(500).json({ error: 'Error finalizing booking' });
                            });
                        }

                        connection.release();
                        res.status(201).json({ 
                            message: 'Rental booked successfully!', 
                            rentalId: rentalId
                        });
                    });
                });
            });
        });
    });
});

// ===============================================
// 5. RETURN RENTAL (Update)
// ===============================================
router.put('/rentals/return/:id', (req, res) => {

    const rentalID = req.params.id;
    const { 
        MileageIn, 
        TotalCost,
        CarVIN
    } = req.body;

    const rentalSQL = `
        UPDATE Rental
        SET
            ActualReturnDate = ?,
            MileageIn = ?,
            TotalCost = ?,
            Status = 'Completed'
        WHERE
            RentalID = ?;
    `;
    
    const actualReturnDate = new Date(); 

    const rentalValues = [actualReturnDate, MileageIn, TotalCost, rentalID];

    db.query(rentalSQL, rentalValues, (err, result) => {
        if (err) {
            console.error('Error updating rental: ', err);
            return res.status(500).json({ error: 'Database error while updating rental' });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Rental not found' });
        }

        const carSQL = `
            UPDATE Car
            SET
                Status = 'Available',
                CurrentMileage = ?
            WHERE
                VIN = ?;
        `;

        const carValues = [MileageIn, CarVIN]; 

        db.query(carSQL, carValues, (err, carResult) => {
            if (err) {
                console.error('Error updating car status: ', err);
                return res.status(500).json({ error: 'Rental updated, but failed to update car status.' });
            }

            res.status(200).json({ 
                message: 'Car return processed successfully!'
            });
        });
    });
});

// ===============================================
// 6. STAFF: ACTIVE RENTALS
// ===============================================
router.get('/rentals/active', (req, res) => {

    const sql = `
        SELECT
            R.RentalID,
            R.PickupDate,
            R.ExpectedReturnDate,
            C.FirstName,
            C.LastName,
            Car.Make,
            Car.Model,
            Car.VIN AS CarVIN
        FROM
            Rental AS R
        JOIN
            Customer AS C ON R.CustomerID = C.CustomerID
        JOIN
            Car AS Car ON R.CarVIN = Car.VIN
        WHERE
            R.Status = 'Active';
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching active rentals: ', err);
            return res.status(500).json({ error: 'Database error' });
        }

        res.json(results);
    });
});

// ===============================================
// 7. ADMIN: GET ALL USERS
// ===============================================
router.get('/admin/users', (req, res) => {

    const sql = `
        SELECT
            CustomerID,
            FirstName,
            LastName,
            Email,
            Role,
            DriversLicenseNumber
        FROM
            Customer
        ORDER BY
            LastName, FirstName;
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching all users: ', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        res.json(results);
    });
});

// ===============================================
// 8. ADMIN: DELETE A USER
// ===============================================
router.delete('/admin/users/:id', (req, res) => {
    
    const customerID = req.params.id;

    db.getConnection((err, connection) => {
        if (err) {
            console.error('Error getting database connection:', err);
            return res.status(500).json({ error: 'Database connection error' });
        }

        connection.beginTransaction(err => {
            if (err) {
                connection.release();
                return res.status(500).json({ error: 'Failed to start transaction' });
            }

            // 1. Delete related payments
            const deletePaymentsSql = 'DELETE FROM Payment WHERE RentalID IN (SELECT RentalID FROM Rental WHERE CustomerID = ?)';
            connection.query(deletePaymentsSql, [customerID], (err, result) => {
                if (err) {
                    return connection.rollback(() => {
                        connection.release();
                        console.error('Error deleting payments:', err);
                        return res.status(500).json({ error: 'Failed to delete user: could not remove related payments.' });
                    });
                }

                // 2. Delete related rentals
                const deleteRentalsSql = 'DELETE FROM Rental WHERE CustomerID = ?';
                connection.query(deleteRentalsSql, [customerID], (err, result) => {
                    if (err) {
                        return connection.rollback(() => {
                            connection.release();
                            console.error('Error deleting rentals:', err);
                            return res.status(500).json({ error: 'Failed to delete user: could not remove related rentals.' });
                        });
                    }

                    // 3. Delete the customer
                    const deleteCustomerSql = 'DELETE FROM Customer WHERE CustomerID = ?';
                    connection.query(deleteCustomerSql, [customerID], (err, result) => {
                        if (err) {
                            return connection.rollback(() => {
                                connection.release();
                                console.error('Error deleting customer:', err);
                                return res.status(500).json({ error: 'Failed to delete user.' });
                            });
                        }

                        if (result.affectedRows === 0) {
                            return connection.rollback(() => {
                                connection.release();
                                return res.status(404).json({ error: 'User not found' });
                            });
                        }

                        // 4. If all successful, commit
                        connection.commit(err => {
                            if (err) {
                                return connection.rollback(() => {
                                    connection.release();
                                    return res.status(500).json({ error: 'Failed to commit transaction.' });
                                });
                            }
                            
                            connection.release();
                            res.json({ message: `User ${customerID} and all related records have been deleted.` });
                        });
                    });
                });
            });
        });
    });
});

// ===============================================
// 9. ADMIN: UPDATE A USER
// ===============================================
router.put('/admin/users/:id', (req, res) => {
    
    const customerID = req.params.id;
    const { FirstName, LastName, Email, DriversLicenseNumber, Role } = req.body;

    if (!FirstName || !LastName || !Email || !DriversLicenseNumber || !Role) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    const sql = `
        UPDATE Customer
        SET
            FirstName = ?,
            LastName = ?,
            Email = ?,
            DriversLicenseNumber = ?,
            Role = ?
        WHERE
            CustomerID = ?;
    `;

    const values = [FirstName, LastName, Email, DriversLicenseNumber, Role, customerID];

    db.query(sql, values, (err, result) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ error: 'Email or Driver\'s License already in use.' });
            }
            console.error('Error updating user: ', err);
            return res.status(500).json({ error: 'Database error while updating user' });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ message: `User ${customerID} updated successfully.` });
    });
});

// ===============================================
// 10. CUSTOMER: GET MY RENTALS
// ===============================================
router.get('/rentals/customer/:id', (req, res) => {
    
    const customerID = req.params.id;

    const sql = `
        SELECT
            R.RentalID,
            R.PickupDate,
            R.ExpectedReturnDate,
            R.ActualReturnDate,
            R.Status,
            Car.Make,
            Car.Model,
            Car.Year
        FROM
            Rental AS R
        JOIN
            Car AS Car ON R.CarVIN = Car.VIN
        WHERE
            R.CustomerID = ?
        ORDER BY
            R.PickupDate DESC;
    `;

    db.query(sql, [customerID], (err, results) => {
        if (err) {
            console.error('Error fetching customer rentals:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        res.json(results);
    });
});

// ===============================================
// 11. ADMIN: GET DASHBOARD OVERVIEW (NEW)
// ===============================================
router.get('/admin/overview', async (req, res) => {
    try {
        // --- 1. Queries for Stat Cards ---
        const revenueQuery = "SELECT SUM(TotalCost) AS totalRevenue FROM Rental WHERE Status = 'Completed'";
        const activeQuery = "SELECT COUNT(*) AS activeRentals FROM Rental WHERE Status = 'Active'";
        const usersQuery = "SELECT COUNT(*) AS totalUsers FROM Customer";
        const carsQuery = "SELECT COUNT(*) AS carsAvailable FROM Car WHERE Status = 'Available'";
        const overdueQuery = "SELECT COUNT(*) AS overdueRentals FROM Rental WHERE Status = 'Active' AND ExpectedReturnDate < NOW()";
        const maintenanceQuery = "SELECT COUNT(*) AS maintenanceCars FROM Car WHERE Status = 'Under Maintenance'";
        const todayQuery = "SELECT COUNT(*) AS bookingsToday FROM Rental WHERE Status = 'Booked' AND DATE(PickupDate) = CURDATE()";

        // --- 2. Query for Live Feed ---
        const recentQuery = `
            SELECT R.RentalID, C.FirstName, C.LastName, Car.Make, Car.Model, R.Status 
            FROM Rental AS R
            JOIN Customer AS C ON R.CustomerID = C.CustomerID
            JOIN Car AS Car ON R.CarVIN = Car.VIN
            ORDER BY R.PickupDate DESC
            LIMIT 5
        `;

        // --- 3. Query for Chart Data ---
        const chartQuery = "SELECT Status, COUNT(*) as count FROM Car GROUP BY Status";

        const [
            [revenueResult],
            [activeResult],
            [usersResult],
            [carsResult],
            [overdueResult],
            [maintenanceResult],
            [todayResult],
            [recentResult],
            [chartResult]
        ] = await Promise.all([
            db.promise().query(revenueQuery),
            db.promise().query(activeQuery),
            db.promise().query(usersQuery),
            db.promise().query(carsQuery),
            db.promise().query(overdueQuery),
            db.promise().query(maintenanceQuery),
            db.promise().query(todayQuery),
            db.promise().query(recentQuery),
            db.promise().query(chartQuery)
        ]);

        // --- 4. Assemble and send the response ---
        res.json({
            stats: {
                totalRevenue: revenueResult[0].totalRevenue || 0,
                activeRentals: activeResult[0].activeRentals,
                totalUsers: usersResult[0].totalUsers,
                carsAvailable: carsResult[0].carsAvailable,
                overdueRentals: overdueResult[0].overdueRentals,
                maintenanceCars: maintenanceResult[0].maintenanceCars,
                bookingsToday: todayResult[0].bookingsToday
            },
            recentRentals: recentResult,
            chartData: chartResult
        });

    } catch (err) {
        console.error("Error fetching admin overview:", err);
        res.status(500).json({ error: 'Database error while fetching overview' });
    }
});
// ===============================================
// 12. ADMIN: CAR MANAGEMENT (NEW SECTION)
// ===============================================

// GET all car categories (for the modal dropdown)
router.get('/admin/categories', (req, res) => {
    const sql = "SELECT CategoryID, CategoryName FROM CarCategory ORDER BY CategoryName";
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching categories:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(results);
    });
});

// GET all branches 
router.get('/admin/branches', (req, res) => {
    const sql = "SELECT BranchID, BranchName FROM Branch ORDER BY BranchName";
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching branches:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(results);
    });
});

// GET all cars (for the main table)
router.get('/admin/cars', (req, res) => {
    const sql = `
        SELECT 
            C.*, 
            CC.CategoryName, 
            B.BranchName 
        FROM Car AS C
        LEFT JOIN CarCategory AS CC ON C.CategoryID = CC.CategoryID
        LEFT JOIN Branch AS B ON C.HomeBranchID = B.BranchID
        ORDER BY C.Make, C.Model;
    `;
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching cars:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(results);
    });
});

// POST (Create) a new car
router.post('/admin/cars', (req, res) => {
    const { VIN, Make, Model, Year, Color, CurrentMileage, Status, CategoryID, HomeBranchID } = req.body;
    
    const sql = `
        INSERT INTO Car 
            (VIN, Make, Model, Year, Color, CurrentMileage, Status, CategoryID, HomeBranchID)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;
    const values = [VIN, Make, Model, Year, Color, CurrentMileage, Status, CategoryID, HomeBranchID];

    db.query(sql, values, (err, result) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ error: 'A car with this VIN already exists.' });
            }
            console.error('Error adding car:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.status(201).json({ message: 'Car added successfully!', vin: VIN });
    });
});

// PUT (Update) an existing car
router.put('/admin/cars/:vin', (req, res) => {
    const originalVIN = req.params.vin;
    const { VIN, Make, Model, Year, Color, CurrentMileage, Status, CategoryID, HomeBranchID } = req.body;

    const sql = `
        UPDATE Car 
        SET 
            VIN = ?, Make = ?, Model = ?, Year = ?, Color = ?, 
            CurrentMileage = ?, Status = ?, CategoryID = ?, HomeBranchID = ?
        WHERE 
            VIN = ?;
    `;
    const values = [VIN, Make, Model, Year, Color, CurrentMileage, Status, CategoryID, HomeBranchID, originalVIN];

    db.query(sql, values, (err, result) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ error: 'A car with this new VIN already exists.' });
            }
            console.error('Error updating car:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Car not found.' });
        }
        res.json({ message: 'Car updated successfully!' });
    });
});

module.exports = router;
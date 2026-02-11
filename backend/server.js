const express = require('express');
const cors = require('cors');
const db = require('./config/db');
const apiRoutes = require('./routes/apiRoutes');
const app = express();
const PORT = 3000;
app.use(cors()); 
app.use(express.json()); 
app.use('/api', apiRoutes);
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
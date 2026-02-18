const express = require('express');
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const dotenv = require('dotenv').config();
const cors = require('cors');
const mongoose = require('mongoose');
const { errorHandler } = require('./middleware/errorMiddleware');
const routes = require('./routes');
const initCronJobs = require('./utils/cronJobs');
const connectDB = require('./config/db');
const path = require('path');
const faceService = require('./utils/face.service');

const port = process.env.PORT || 5000;

// Connect to Database
connectDB();

// Load Face Models
faceService.loadModels().catch(err => {
    console.error('Failed to load face models:', err);
});

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Static folder for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api', routes);

// Init Cron Jobs
initCronJobs();

// Home route
app.get('/', (req, res) => {
    res.send('API is running...');
});

// Error Middleware
app.use(errorHandler);

app.listen(port, () => console.log(`Server started on port ${port}`));

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeBloomFilter } from './utils/bloomFilter.js';

// Import routes
import loginRoute from './routes/loginRoute.js';
import timetableRoute from './routes/timetableRoute.js';
import studentGroupRoute from './routes/studentGroupRoute.js';
import subjectRoute from './routes/subjectRoute.js';
import classroomRoutes from './routes/classroomRoute.js';
import teacherPreferenceRoutes from './routes/teacherPreferenceRoute.js';
import activityRoutes from './routes/activityRoutes.js';
import teacherRoute from './routes/teacherRoute.js';

dotenv.config();
const app = express();

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Use routes
app.use('/api', loginRoute);
app.use('/api', timetableRoute);
app.use('/api', studentGroupRoute);
app.use('/api', subjectRoute);
app.use('/api', classroomRoutes);
app.use('/api', teacherPreferenceRoutes);
app.use('/api/teacher', activityRoutes);
app.use('/api/teacher', teacherRoute); // This route handles /student-groups endpoint

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/classroom';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => console.log('MongoDB connection error:', err));

mongoose.connection.once('open', () => {
  console.log('Connected to MongoDB');
  initializeBloomFilter();
});

// Port
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

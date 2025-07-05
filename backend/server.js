// Basic Express server for Admin Dashboard
const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/admin_dashboard';

app.use(cors());
app.use(express.json());

let db;

// Connect to MongoDB
MongoClient.connect(MONGO_URI, { useUnifiedTopology: true })
  .then(client => {
    db = client.db();
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => console.error('MongoDB connection error:', err));

// Dashboard stats endpoint
app.get('/api/dashboard-stats', async (req, res) => {
  try {
    const students = db.collection('students');
    const applications = db.collection('applications');
    const exams = db.collection('exams');
    const total = await students.countDocuments();
    const ielts = await students.countDocuments({ course: 'ielts' });
    const pte = await students.countDocuments({ course: 'pte' });
    const active = await applications.countDocuments({ status: 'active' });
    res.json({ total, ielts, pte, active });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Students endpoint
app.get('/api/students', async (req, res) => {
  try {
    const students = await db.collection('students').find().toArray();
    res.json(students);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Exams endpoint
app.get('/api/exams', async (req, res) => {
  try {
    const exams = await db.collection('exams').find().toArray();
    res.json(exams);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Applications endpoint
app.get('/api/applications', async (req, res) => {
  try {
    const applications = await db.collection('applications').find().toArray();
    res.json(applications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Tasks endpoint
app.get('/api/tasks', async (req, res) => {
  try {
    const tasks = await db.collection('tasks').find().toArray();
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Security info endpoint
app.get('/api/security', async (req, res) => {
  try {
    const security = await db.collection('security').findOne();
    res.json(security || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Recent activities endpoint
app.get('/api/activities', async (req, res) => {
  try {
    const activities = await db.collection('activities').find().sort({ date: -1 }).limit(10).toArray();
    res.json(activities);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}); 
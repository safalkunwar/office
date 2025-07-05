# Admin Dashboard Backend

This is a simple Express.js backend for the Admin Dashboard. It connects to MongoDB and provides API endpoints for dashboard statistics, students, exams, applications, tasks, security info, and recent activities.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables:
   - Copy `.env` and set your MongoDB URI if needed.

3. Start the server:
   ```bash
   npm start
   ```

The server will run on `http://localhost:5000` by default.

## API Endpoints

- `GET /api/dashboard-stats` — Dashboard statistics
- `GET /api/students` — List of students
- `GET /api/exams` — List of exams
- `GET /api/applications` — List of applications
- `GET /api/tasks` — List of tasks
- `GET /api/security` — Security info
- `GET /api/activities` — Recent activities

## Notes
- Make sure MongoDB is running locally or update the `MONGO_URI` in `.env` to use MongoDB Atlas or another host. 
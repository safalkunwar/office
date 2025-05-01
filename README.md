# Target Application

A web application with Firebase integration for managing student records, applications, and documents.

## Project Structure

- `/js` - JavaScript files
  - `/admin` - Admin-specific functionality
  - `/employee` - Employee-specific functionality
  - `/config` - Configuration files
- `/html` - HTML templates
- `/css` - Stylesheets
- `/node_modules` - Dependencies

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory with your Firebase configuration:
```
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your_auth_domain
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_storage_bucket
FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
FIREBASE_APP_ID=your_app_id
```

3. Start the application:
```bash
npm start
```

## Features

- Student management
- Application processing
- Document handling
- Exam management
- Reporting system

## Security

- Firebase Authentication for user management
- Role-based access control
- Secure file storage
- CORS configuration for API security 
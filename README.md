# Student Management System

A comprehensive web-based system for managing students, applications, exams, and tasks for educational institutions.

## Features

### 🎓 Student Management
- Add, edit, and manage student information
- Track student progress and course enrollment
- Filter students by course type (IELTS/PTE)
- View student statistics and analytics

### 📝 Application Management
- Track university applications
- Monitor application status (pending, under review, approved, rejected)
- Filter applications by various criteria
- Application analytics and reporting

### 📊 Exam Management
- Schedule and manage exams
- Track exam results and performance
- Support for IELTS and PTE exams
- Exam analytics and progress tracking

### ✅ Task Management
- Create and assign tasks
- Track task status and completion
- Priority-based task organization
- Task reminders and notifications

### 🎨 User Interface
- Modern, responsive design
- Light/Dark mode support
- Mobile-friendly interface
- Intuitive navigation

## Setup Instructions

### 1. Firebase Configuration

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Realtime Database
3. Set up Authentication (Anonymous auth is sufficient for demo)
4. Update the Firebase configuration in `js/index.js`:

```javascript
const firebaseConfig = {
    apiKey: "your-api-key",
    authDomain: "your-project.firebaseapp.com",
    databaseURL: "https://your-project-default-rtdb.firebaseio.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "your-sender-id",
    appId: "your-app-id"
};
```

### 2. Database Rules

Set up Firebase Realtime Database rules for security:

```json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null"
  }
}
```

### 3. File Structure

```
student-management-system/
├── index.html              # Main dashboard
├── test.html               # System test page
├── css/
│   ├── style.css          # Main styles
│   └── admin.css          # Admin-specific styles
├── js/
│   └── index.js           # Main JavaScript functionality
├── html/                  # Additional pages
│   ├── students.html
│   ├── exams.html
│   ├── applications.html
│   └── tasks.html
└── README.md
```

## Usage Guide

### Getting Started

1. **Open the Dashboard**: Navigate to `index.html` in your browser
2. **Create Sample Data**: Click "Create Sample Data" to populate the system with test data
3. **Test System**: Click "Test System" to run comprehensive tests
4. **Explore Features**: Navigate through different sections using the top menu

### Key Functions

#### Dashboard Overview
- View real-time statistics
- Monitor student progress
- Track application analytics
- Manage tasks

#### Student Management
- Add new students with contact information
- Track course enrollment (IELTS/PTE)
- Monitor student status and progress
- Filter and search students

#### Application Tracking
- Record university applications
- Update application status
- Add notes and comments
- Generate application reports

#### Exam Management
- Schedule exams with date and time
- Track exam results
- Monitor performance trends
- Generate exam analytics

#### Task Management
- Create tasks with priorities
- Assign due dates
- Track completion status
- Manage task workflow

## Testing

### Automated Testing
Use the built-in test page (`test.html`) to verify all system functions:

1. **Database Connection**: Test Firebase connectivity
2. **Authentication**: Verify user authentication
3. **Data Management**: Test CRUD operations
4. **Function Tests**: Verify all JavaScript functions
5. **UI Tests**: Test theme switching and responsiveness

### Manual Testing
1. Create sample data using the dashboard button
2. Navigate through all sections
3. Test filtering and search functions
4. Verify responsive design on mobile devices
5. Test theme switching (light/dark mode)

## Customization

### Adding New Features
1. Create new HTML pages in the `html/` directory
2. Add corresponding CSS in `css/style.css`
3. Implement JavaScript functions in `js/index.js`
4. Update navigation menu in `index.html`

### Styling
The system uses CSS custom properties for easy theming:

```css
:root {
    --primary-color: #007bff;
    --background-color: #ffffff;
    --text-color: #333333;
    --surface-color: #f8f9fa;
    --border-color: #dee2e6;
}
```

### Database Schema
The system uses the following Firebase collections:

- `students`: Student information and progress
- `applications`: University applications
- `exams`: Exam schedules and results
- `tasks`: Task management data

## Troubleshooting

### Common Issues

1. **Firebase Connection Error**
   - Verify Firebase configuration
   - Check internet connection
   - Ensure Firebase project is active

2. **Authentication Issues**
   - Enable Anonymous authentication in Firebase
   - Check browser console for errors

3. **Data Not Loading**
   - Verify database rules allow read/write
   - Check Firebase console for errors
   - Ensure proper data structure

4. **Styling Issues**
   - Clear browser cache
   - Check CSS file paths
   - Verify Font Awesome CDN connection

### Browser Compatibility
- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## Security Considerations

1. **Firebase Security Rules**: Implement proper database rules
2. **Input Validation**: Validate all user inputs
3. **Authentication**: Use proper authentication methods
4. **Data Encryption**: Consider encrypting sensitive data
5. **Regular Updates**: Keep dependencies updated

## Support

For issues and questions:
1. Check the test page for system diagnostics
2. Review browser console for error messages
3. Verify Firebase configuration
4. Test with sample data first

## License

This project is for educational purposes. Please ensure compliance with your organization's policies and local regulations.

---

**Note**: This is a demo system. For production use, implement proper security measures, data validation, and user authentication. 
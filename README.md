# UI Dashboard - Frontend Application

## 🌟 Overview
A modern, responsive dashboard built with React and PrimeReact that provides data visualization and analytics capabilities. The application connects to a backend service to fetch and display data in an intuitive interface.

## 🏗️ Project Structure
```
frontend/
├── public/           # Static files
├── src/
│   ├── assets/       # Images, fonts, etc.
│   ├── components/   # Reusable UI components
│   │   ├── common/   # Common components
│   │   ├── layout/   # Layout components
│   │   └── shared/   # Shared utilities
│   ├── contexts/     # React contexts
│   ├── pages/        # Page components
│   ├── services/     # API services
│   ├── styles/       # Global styles
│   ├── utils/        # Helper functions
│   ├── App.jsx       # Main App component
│   └── main.jsx      # Application entry point
├── .env              # Environment variables
└── package.json      # Dependencies and scripts
```

## 🚀 Features
- **Responsive Design**: Works on all device sizes
- **Theme Support**: Light/Dark mode
- **Data Visualization**: Charts and tables
- **Query Builder**: Advanced data filtering
- **Real-time Updates**: Auto-refreshing data
- **Accessibility**: WCAG 2.1 compliant

## 🛠️ Prerequisites
- Node.js v18+
- npm v9+ or yarn
- Backend service running

## ⚙️ Setup
1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env
   # Update .env with your backend URL
   ```

## 🚦 Environment Variables
```env
REACT_APP_API_URL=http://localhost:3001
REACT_APP_ENV=development
REACT_APP_VERSION=1.0.0
```

## 🏃‍♂️ Running the Application
- Development: `npm start`
- Build: `npm run build`
- Test: `npm test`
- Lint: `npm run lint`
- Format: `npm run format`

## 📦 Key Dependencies
- React 18
- React Router
- PrimeReact
- Axios
- Chart.js
- Date-fns
- React Query

## 🎨 Styling
- CSS Modules for component-specific styles
- PrimeReact theming
- Custom utility classes
- Responsive breakpoints

## 📱 Browser Support
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## 🤝 Contributing
1. Create a feature branch
2. Make your changes
3. Write tests if applicable
4. Submit a pull request

## 📄 License
MIT

## 📝 Notes
- Ensure backend service is running before starting the frontend
- Environment variables must be prefixed with `REACT_APP_`
- Use absolute imports for better maintainability

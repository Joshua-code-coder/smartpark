import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Index from './pages/Index';
import { AuthProvider, useAuth } from './AuthContext';

function AppRoutes() {
  // Use auth context to get current auth state
  const { isAuthenticated } = useAuth();
  
  console.log('AppRoutes render - isAuthenticated:', isAuthenticated);

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" />} />
      <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/dashboard" />} />

      {/* Protected routes */}
      <Route path="/dashboard" element={isAuthenticated ? <Index /> : <Navigate to="/login" />} />

      {/* Default redirect */}
      <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} />

      {/* Catch all - redirect to appropriate page */}
      <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
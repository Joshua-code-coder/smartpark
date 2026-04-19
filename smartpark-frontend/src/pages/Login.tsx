import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  // Debug: Check current auth status
  console.log('Login component render - userId in localStorage:', localStorage.getItem('userId'));

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      console.log('Attempting login with email:', email);
      const res = await fetch('http://localhost:3000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      console.log('Response status:', res.status);
      console.log('Response ok:', res.ok);

      if (!res.ok) {
        console.error('HTTP error, status:', res.status);
        alert(`Server error: ${res.status} ${res.statusText}`);
        setIsLoading(false);
        return;
      }

      const data = await res.json();
      console.log('Login response:', data);

      if (data.success) {
        console.log('Login successful, storing user data');
        // Use auth context to update auth state
        login(String(data.user.user_id), data.user.name, email);

        console.log('User data stored, navigating to dashboard');
        // Redirect to dashboard
        navigate('/dashboard');
      } else {
        console.log('Login failed:', data.message);
        alert(data.message || 'Invalid email or password');
      }
    } catch (err) {
      console.error('Login error:', err);
      alert(`Login failed: ${err instanceof Error ? err.message : 'Unknown error'}\nPlease check if the backend is running on http://localhost:3000`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-700 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md transform transition hover:shadow-3xl">
        <div className="text-center mb-8">
          <div className="inline-block p-3 bg-blue-100 rounded-full mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-800">SmartPark</h2>
          <p className="text-gray-600 mt-2">Welcome back! Login to continue</p>
        </div>

        <form onSubmit={handleLogin}>
          <div className="mb-5">
            <label className="block text-gray-700 font-semibold mb-2">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 font-semibold mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-700 text-white py-3 rounded-lg hover:shadow-lg disabled:opacity-50 font-semibold transition transform hover:scale-105"
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="text-center mt-6">
          <p className="text-gray-600">
            Don't have an account?{' '}
            <button
              onClick={() => navigate('/register')}
              className="text-blue-600 hover:text-blue-700 font-semibold transition"
            >
              Register here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
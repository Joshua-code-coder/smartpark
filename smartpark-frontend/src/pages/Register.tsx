import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [vehicles, setVehicles] = useState<string[]>(['']);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleAddVehicle = () => {
    setVehicles([...vehicles, '']);
  };

  const handleRemoveVehicle = (index: number) => {
    setVehicles(vehicles.filter((_, i) => i !== index));
  };

  const handleVehicleChange = (index: number, value: string) => {
    const newVehicles = [...vehicles];
    newVehicles[index] = value.toUpperCase();
    setVehicles(newVehicles);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      // Filter out empty vehicles
      const validVehicles = vehicles.filter(v => v && v.trim() !== '');
      
      const res = await fetch('http://localhost:3000/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name, 
          email, 
          password, 
          vehicles: validVehicles
        })
      });

      const data = await res.json();

      if (data.success) {
        alert('Registration successful! Please login.');
        navigate('/login');
      } else {
        alert(data.message || 'Registration failed');
      }
    } catch (err) {
      console.error('Registration error:', err);
      alert('Registration failed. Please check if the backend is running.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-gray-800">Register for SmartPark</h2>
          <p className="text-gray-600 mt-2">Join us and manage your parking easily</p>
        </div>

        <form onSubmit={handleRegister}>
          <div className="mb-4">
            <label className="block text-gray-700 font-semibold mb-2">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 font-semibold mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 font-semibold mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 font-semibold mb-2">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full p-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition"
              required
            />
          </div>

          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <label className="block text-gray-700 font-semibold">Car License Plates</label>
              <span className="text-sm text-gray-500">(Optional)</span>
            </div>
            
            <div className="space-y-3">
              {vehicles.map((plate, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={plate}
                    onChange={(e) => handleVehicleChange(index, e.target.value)}
                    placeholder="e.g., ABC-123"
                    className="flex-1 p-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition"
                  />
                  {vehicles.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveVehicle(index)}
                      className="p-3 text-red-500 hover:bg-red-50 rounded-lg transition"
                      title="Remove vehicle"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleAddVehicle}
              className="mt-3 flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold text-sm transition"
            >
              <Plus size={18} /> Add Another Vehicle
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 rounded-lg hover:shadow-lg disabled:opacity-50 font-semibold transition transform hover:scale-105"
          >
            {isLoading ? 'Registering...' : 'Create Account'}
          </button>
        </form>

        <div className="text-center mt-6">
          <p className="text-gray-600">
            Already have an account?{' '}
            <button
              onClick={() => navigate('/login')}
              className="text-blue-600 hover:text-blue-700 font-semibold transition"
            >
              Login here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
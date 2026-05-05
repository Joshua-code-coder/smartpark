import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Car, History, LayoutDashboard, LogOut, Settings, MapPin, Plus, Trash2, Clock, MapPinIcon } from 'lucide-react';
import { useAuth } from '../AuthContext';

const Index = () => {
  const [view, setView] = useState('booking');
  const [slots, setSlots] = useState([]);
  const [history, setHistory] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [newPlate, setNewPlate] = useState('');
  const [timeRemaining, setTimeRemaining] = useState<{ [key: number]: string }>({});
  
  const { logout, userId, userName } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // 1. Fetch Data from Backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get Available Slots
        const slotRes = await fetch('https://smartpark-backend-rmc1.onrender.com/slots');
        const slotData = await slotRes.json();
        if (slotData.success) setSlots(slotData.slots);

        // Get User History
        const histRes = await fetch(`https://smartpark-backend-rmc1.onrender.com/history/${userId}`);
        const histData = await histRes.json();
        if (histData.success) setHistory(histData.history);

        // Get User Vehicles
        const vehRes = await fetch(`https://smartpark-backend-rmc1.onrender.com/vehicles/${userId}`);
        const vehData = await vehRes.json();
        if (vehData.success) setVehicles(vehData.vehicles);
      } catch (err) {
        console.error("Backend not reachable. Check if server.js is running!");
      }
    };
    fetchData();
  }, [userId, view]);

  // 2. Countdown Timer for History
  useEffect(() => {
    const interval = setInterval(() => {
      const newTimeRemaining: { [key: number]: string } = {};
      history.forEach((h: any) => {
        const endTime = new Date(h.end_time).getTime();
        const now = new Date().getTime();
        const remaining = Math.max(0, endTime - now);
        
        if (remaining === 0) {
          newTimeRemaining[h.id] = 'Expired';
        } else {
          const hours = Math.floor(remaining / (1000 * 60 * 60));
          const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
          newTimeRemaining[h.id] = `${hours}h ${minutes}m ${seconds}s`;
        }
      });
      setTimeRemaining(newTimeRemaining);
    }, 1000);

    return () => clearInterval(interval);
  }, [history]);

  // 3. Booking Function
  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    const bookingDetails = {
      userId: userId,
      vehicleId: formData.get('vehicleId'),
      slotId: formData.get('slotId'),
      durationMins: formData.get('duration'),
      amount: (Number(formData.get('duration')) / 60) * 10
    };

    const res = await fetch('https://smartpark-backend-rmc1.onrender.com/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookingDetails)
    });

    if (res.ok) {
      alert("Parking Reserved Successfully!");
      setView('history');
    }
  };

  // 4. Add Vehicle Function
  const handleAddVehicle = async () => {
    if (!newPlate.trim()) {
      alert('Please enter a license plate');
      return;
    }

    try {
      const res = await fetch('https://smartpark-backend-rmc1.onrender.com/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, licensePlate: newPlate.toUpperCase() })
      });

      if (res.ok) {
        setNewPlate('');
        // Refresh vehicles list
        const vehRes = await fetch(`https://smartpark-backend-rmc1.onrender.com/vehicles/${userId}`);
        const vehData = await vehRes.json();
        if (vehData.success) setVehicles(vehData.vehicles);
        alert('Vehicle added successfully!');
      } else {
        alert('Failed to add vehicle');
      }
    } catch (err) {
      console.error('Error adding vehicle:', err);
      alert('Error adding vehicle');
    }
  };

  // 5. Delete Vehicle Function
  const handleDeleteVehicle = async (vehicleId: number) => {
    if (!window.confirm('Are you sure you want to delete this vehicle?')) return;

    try {
      const res = await fetch(`https://smartpark-backend-rmc1.onrender.com/vehicles/${vehicleId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setVehicles(vehicles.filter((v: any) => v.id !== vehicleId));
        alert('Vehicle deleted successfully!');
      } else {
        alert('Failed to delete vehicle');
      }
    } catch (err) {
      console.error('Error deleting vehicle:', err);
      alert('Error deleting vehicle');
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-gradient-to-b from-blue-600 to-blue-800 shadow-xl text-white">
        <div className="p-6 border-b border-blue-500">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-white rounded-full">
              <MapPin className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold">SmartPark</h2>
          </div>
          <p className="text-blue-100">Welcome, {userName}</p>
        </div>
        <nav className="mt-4 space-y-2 p-2">
          <button 
            onClick={() => setView('dashboard')} 
            className={`w-full text-left p-4 rounded-lg transition transform ${view === 'dashboard' ? 'bg-white text-blue-600 shadow-lg' : 'text-white hover:bg-blue-500 hover:scale-105'}`}
          >
            <LayoutDashboard className="inline mr-3" size={20} /> Dashboard
          </button>
          <button 
            onClick={() => setView('booking')} 
            className={`w-full text-left p-4 rounded-lg transition transform ${view === 'booking' ? 'bg-white text-blue-600 shadow-lg' : 'text-white hover:bg-blue-500 hover:scale-105'}`}
          >
            <MapPin className="inline mr-3" size={20} /> Book Parking
          </button>
          <button 
            onClick={() => setView('history')} 
            className={`w-full text-left p-4 rounded-lg transition transform ${view === 'history' ? 'bg-white text-blue-600 shadow-lg' : 'text-white hover:bg-blue-500 hover:scale-105'}`}
          >
            <History className="inline mr-3" size={20} /> History
          </button>
          <button 
            onClick={() => setView('vehicles')} 
            className={`w-full text-left p-4 rounded-lg transition transform ${view === 'vehicles' ? 'bg-white text-blue-600 shadow-lg' : 'text-white hover:bg-blue-500 hover:scale-105'}`}
          >
            <Car className="inline mr-3" size={20} /> Vehicles
          </button>
          <button 
            onClick={() => setView('settings')} 
            className={`w-full text-left p-4 rounded-lg transition transform ${view === 'settings' ? 'bg-white text-blue-600 shadow-lg' : 'text-white hover:bg-blue-500 hover:scale-105'}`}
          >
            <Settings className="inline mr-3" size={20} /> Settings
          </button>
          <button 
            onClick={handleLogout} 
            className="w-full text-left p-4 text-red-200 hover:bg-red-600 rounded-lg transition transform hover:scale-105 mt-8"
          >
            <LogOut className="inline mr-3" size={20} /> Logout
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          {/* Dashboard View */}
          {view === 'dashboard' && (
            <div>
              <h1 className="text-4xl font-bold text-gray-800 mb-8">Dashboard</h1>
              <div className="grid grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-2xl shadow-lg transform hover:scale-105 transition">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-blue-100 text-sm font-semibold">Available Slots</p>
                      <p className="text-4xl font-bold mt-2">{slots.length}</p>
                    </div>
                    <MapPin className="w-12 h-12 opacity-50" />
                  </div>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-2xl shadow-lg transform hover:scale-105 transition">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-purple-100 text-sm font-semibold">Your Vehicles</p>
                      <p className="text-4xl font-bold mt-2">{vehicles.length}</p>
                    </div>
                    <Car className="w-12 h-12 opacity-50" />
                  </div>
                </div>
                <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-2xl shadow-lg transform hover:scale-105 transition">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-green-100 text-sm font-semibold">Bookings</p>
                      <p className="text-4xl font-bold mt-2">{history.length}</p>
                    </div>
                    <History className="w-12 h-12 opacity-50" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Booking View */}
          {view === 'booking' && (
            <div>
              <h1 className="text-4xl font-bold text-gray-800 mb-8">Book Parking</h1>
              <form onSubmit={handleBooking} className="bg-white p-8 rounded-2xl shadow-lg max-w-2xl">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-gray-700 font-semibold mb-3">Select Vehicle</label>
                    <select name="vehicleId" className="w-full p-4 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition bg-white" required>
                      <option value="">-- Choose a vehicle --</option>
                      {vehicles.map((v: any) => <option key={v.id} value={v.id}>{v.make} {v.model} ({v.plate})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-3">Select Slot</label>
                    <select name="slotId" className="w-full p-4 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition bg-white" required>
                      <option value="">-- Choose a parking slot --</option>
                      {slots.filter((s: any) => s.available).map((s: any) => <option key={s.id} value={s.id}>Slot {s.id} - {s.location}</option>)}
                    </select>
                  </div>
                </div>
                <div className="mt-6">
                  <label className="block text-gray-700 font-semibold mb-3">Duration (minutes)</label>
                  <input type="number" name="duration" className="w-full p-4 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition" min="30" step="30" required />
                </div>
                <button type="submit" className="w-full mt-6 bg-gradient-to-r from-blue-500 to-blue-700 text-white px-6 py-4 rounded-lg hover:shadow-lg font-bold text-lg transition transform hover:scale-105">Book Now</button>
              </form>
            </div>
          )}

          {/* History View */}
          {view === 'history' && (
            <div>
              <h1 className="text-4xl font-bold text-gray-800 mb-8">Booking History</h1>
              {history.length === 0 ? (
                <div className="bg-white p-12 rounded-2xl shadow-lg text-center">
                  <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">No bookings yet. Start by booking a parking slot!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {history.map((h: any) => (
                    <div key={h.id} className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition border-l-4 border-blue-500">
                      <div className="grid grid-cols-5 gap-4 items-center">
                        <div>
                          <p className="text-gray-500 text-sm font-semibold">Vehicle Plate</p>
                          <p className="text-2xl font-bold text-blue-600">{h.vehicleId}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-sm font-semibold">Location</p>
                          <p className="text-lg text-gray-800 font-semibold flex items-center gap-1"><MapPinIcon size={18} /> {h.location || 'Unknown'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-sm font-semibold">Date & Time</p>
                          <p className="text-sm text-gray-700">{new Date(h.booking_time).toLocaleDateString()} {new Date(h.booking_time).toLocaleTimeString()}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-sm font-semibold">Duration</p>
                          <p className="text-lg text-gray-800 font-semibold">{h.durationMins} min</p>
                        </div>
                        <div className="text-center">
                          <p className="text-gray-500 text-sm font-semibold">Time Remaining</p>
                          <p className={`text-lg font-bold ${timeRemaining[h.id]?.includes('Expired') ? 'text-red-600' : 'text-green-600'}`}>
                            {timeRemaining[h.id] || 'Calculating...'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Vehicles View */}
          {view === 'vehicles' && (
            <div>
              <h1 className="text-4xl font-bold text-gray-800 mb-8">Your Vehicles</h1>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {vehicles.length === 0 ? (
                  <div className="bg-white p-12 rounded-2xl shadow-lg text-center col-span-2">
                    <Car className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">No vehicles registered yet.</p>
                  </div>
                ) : (
                  vehicles.map((v: any) => (
                    <div key={v.id} className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition border-l-4 border-purple-500">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="text-gray-500 text-sm">License Plate</p>
                          <p className="text-3xl font-bold text-purple-600">{v.plate}</p>
                        </div>
                        <button
                          onClick={() => handleDeleteVehicle(v.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                      <p className="text-gray-600">{v.make} {v.model}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Settings View */}
          {view === 'settings' && (
            <div>
              <h1 className="text-4xl font-bold text-gray-800 mb-8">Settings</h1>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Profile Settings */}
                <div className="bg-white p-8 rounded-2xl shadow-lg">
                  <h2 className="text-2xl font-bold text-gray-800 mb-6">User Profile</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-gray-700 font-semibold mb-2">Full Name</label>
                      <input type="text" value={userName} disabled className="w-full p-4 border-2 border-gray-300 rounded-lg bg-gray-100 text-gray-600" />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-semibold mb-2">Email</label>
                      <input type="email" value={localStorage.getItem('userEmail') || ''} disabled className="w-full p-4 border-2 border-gray-300 rounded-lg bg-gray-100 text-gray-600" />
                    </div>
                  </div>
                  <button
                    onClick={() => alert('Profile update coming soon!')}
                    className="w-full mt-6 bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-lg hover:shadow-lg font-semibold transition transform hover:scale-105"
                  >
                    Update Profile
                  </button>
                </div>

                {/* Vehicle Management */}
                <div className="bg-white p-8 rounded-2xl shadow-lg">
                  <h2 className="text-2xl font-bold text-gray-800 mb-6">Add Vehicle</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-gray-700 font-semibold mb-2">License Plate</label>
                      <input
                        type="text"
                        value={newPlate}
                        onChange={(e) => setNewPlate(e.target.value.toUpperCase())}
                        placeholder="e.g., ABC-123"
                        className="w-full p-4 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition"
                      />
                    </div>
                    <button
                      onClick={handleAddVehicle}
                      className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-lg hover:shadow-lg font-semibold transition transform hover:scale-105 flex items-center justify-center gap-2"
                    >
                      <Plus size={20} /> Add Vehicle
                    </button>
                  </div>
                  <hr className="my-6" />
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Current Vehicles</h3>
                  <div className="space-y-2">
                    {vehicles.length === 0 ? (
                      <p className="text-gray-500">No vehicles added yet</p>
                    ) : (
                      vehicles.map((v: any) => (
                        <div key={v.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                          <span className="font-semibold text-gray-800">{v.plate}</span>
                          <button
                            onClick={() => handleDeleteVehicle(v.id)}
                            className="text-red-500 hover:text-red-700 transition"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Preferences */}
              <div className="bg-white p-8 rounded-2xl shadow-lg mt-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Preferences</h2>
                <div className="space-y-4">
                  <label className="flex items-center p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition">
                    <input type="checkbox" className="mr-3 w-5 h-5" defaultChecked={true} />
                    <span className="text-gray-700 font-semibold">Receive booking notifications</span>
                  </label>
                  <label className="flex items-center p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition">
                    <input type="checkbox" className="mr-3 w-5 h-5" defaultChecked={true} />
                    <span className="text-gray-700 font-semibold">Receive promotional offers</span>
                  </label>
                  <label className="flex items-center p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition">
                    <input type="checkbox" className="mr-3 w-5 h-5" defaultChecked={false} />
                    <span className="text-gray-700 font-semibold">Email me about new features</span>
                  </label>
                </div>
                <button
                  onClick={() => alert('Preferences saved!')}
                  className="w-full mt-6 bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-lg hover:shadow-lg font-semibold transition transform hover:scale-105"
                >
                  Save Settings
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
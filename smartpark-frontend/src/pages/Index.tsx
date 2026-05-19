import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Car, History, LayoutDashboard, LogOut, Settings, MapPin, Plus, Trash2, MapPinIcon } from 'lucide-react';
import { useAuth } from '../AuthContext';

const API_BASE = 'https://smartpark-backend-rmc1.onrender.com/api';

const Index = () => {
  const [view, setView] = useState('booking');
  const [slots, setSlots] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [newPlate, setNewPlate] = useState('');
  const [timeRemaining, setTimeRemaining] = useState<{ [key: number]: string }>({});

  const { logout, userId, userName } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const fetchData = async () => {
    if (!userId) return;

    try {
      const slotRes = await fetch(`${API_BASE}/slots`);
      const slotData = await slotRes.json();
      if (slotData.success) setSlots(slotData.slots || []);

      const histRes = await fetch(`${API_BASE}/history/${userId}`);
      const histData = await histRes.json();
      if (histData.success) setHistory(histData.history || []);

      const vehRes = await fetch(`${API_BASE}/vehicles/${userId}`);
      const vehData = await vehRes.json();
      if (vehData.success) setVehicles(vehData.vehicles || []);
    } catch (err) {
      console.error('Backend not reachable:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userId, view]);

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

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();

    const formData = new FormData(e.target as HTMLFormElement);

    const bookingDetails = {
      userId,
      vehicleId: formData.get('vehicleId'),
      slotId: formData.get('slotId'),
      durationHours: Number(formData.get('durationHours'))
    };

    try {
      const res = await fetch(`${API_BASE}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingDetails)
      });

      const data = await res.json();

      if (data.success) {
        alert(`Parking Reserved Successfully! Amount: ${data.amount} AED`);
        await fetchData();
        setView('history');
      } else {
        alert(data.message || 'Booking failed');
      }
    } catch (err) {
      console.error('Booking error:', err);
      alert('Booking failed. Backend not reachable.');
    }
  };

  const handleAddVehicle = async () => {
    if (!newPlate.trim()) {
      alert('Please enter a license plate');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/vehicles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, licensePlate: newPlate.trim().toUpperCase() })
      });

      const data = await res.json();

      if (data.success) {
        setNewPlate('');
        await fetchData();
        alert('Vehicle added successfully!');
      } else {
        alert(data.message || 'Failed to add vehicle');
      }
    } catch (err) {
      console.error('Error adding vehicle:', err);
      alert('Error adding vehicle');
    }
  };

  const handleDeleteVehicle = async (vehicleId: number) => {
    if (!window.confirm('Are you sure you want to delete this vehicle?')) return;

    try {
      const res = await fetch(`${API_BASE}/vehicles/${vehicleId}`, {
        method: 'DELETE'
      });

      const data = await res.json();

      if (data.success) {
        await fetchData();
        alert('Vehicle deleted successfully!');
      } else {
        alert(data.message || 'Failed to delete vehicle');
      }
    } catch (err) {
      console.error('Error deleting vehicle:', err);
      alert('Error deleting vehicle');
    }
  };

  const availableSlots = slots.filter((s: any) => Number(s.available ?? s.is_available) === 1);

  return (
    <div className="flex h-screen bg-gray-50">
      <div className="w-64 bg-white shadow-xl">
        <div className="p-6 border-b">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-blue-100 rounded-full">
              <MapPin className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">SmartPark</h2>
          </div>
          <p className="text-gray-500">Welcome, {userName}</p>
        </div>

        <nav className="mt-4 space-y-2 p-4">
          <button onClick={() => setView('dashboard')} className={`w-full text-left p-4 rounded-lg ${view === 'dashboard' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}>
            <LayoutDashboard className="inline mr-3" size={20} /> Dashboard
          </button>

          <button onClick={() => setView('booking')} className={`w-full text-left p-4 rounded-lg ${view === 'booking' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}>
            <MapPin className="inline mr-3" size={20} /> Book Parking
          </button>

          <button onClick={() => setView('history')} className={`w-full text-left p-4 rounded-lg ${view === 'history' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}>
            <History className="inline mr-3" size={20} /> History
          </button>

          <button onClick={() => setView('vehicles')} className={`w-full text-left p-4 rounded-lg ${view === 'vehicles' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}>
            <Car className="inline mr-3" size={20} /> Vehicles
          </button>

          <button onClick={() => setView('settings')} className={`w-full text-left p-4 rounded-lg ${view === 'settings' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}>
            <Settings className="inline mr-3" size={20} /> Settings
          </button>

          <button onClick={handleLogout} className="w-full text-left p-4 text-red-500 hover:bg-red-50 rounded-lg mt-8">
            <LogOut className="inline mr-3" size={20} /> Logout
          </button>
        </nav>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="p-8">
          {view === 'dashboard' && (
            <div>
              <h1 className="text-4xl font-bold text-gray-800 mb-8">Dashboard</h1>

              <div className="grid grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow">
                  <p className="text-gray-500 font-semibold">Available Slots</p>
                  <p className="text-4xl font-bold mt-2">{availableSlots.length}</p>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow">
                  <p className="text-gray-500 font-semibold">Your Vehicles</p>
                  <p className="text-4xl font-bold mt-2">{vehicles.length}</p>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow">
                  <p className="text-gray-500 font-semibold">Your Bookings</p>
                  <p className="text-4xl font-bold mt-2">{history.length}</p>
                </div>
              </div>
            </div>
          )}

          {view === 'booking' && (
            <div>
              <h1 className="text-4xl font-bold text-gray-800 mb-8">Book Parking</h1>

              <form onSubmit={handleBooking} className="bg-white p-8 rounded-2xl shadow-lg max-w-2xl">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-gray-700 font-semibold mb-3">Select Vehicle</label>
                    <select name="vehicleId" className="w-full p-4 border-2 border-gray-300 rounded-lg" required>
                      <option value="">-- Choose a vehicle --</option>
                      {vehicles.map((v: any) => (
                        <option key={v.id} value={v.id}>
                          {v.plate || v.license_plate}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-700 font-semibold mb-3">Select Slot</label>
                    <select name="slotId" className="w-full p-4 border-2 border-gray-300 rounded-lg" required>
                      <option value="">-- Choose a parking slot --</option>
                      {availableSlots.map((s: any) => (
                        <option key={s.id} value={s.id}>
                          {s.slot_number} - {s.location} - {s.hourly_rate} AED/hr
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {availableSlots.length === 0 && (
                  <p className="text-red-500 mt-4">No available slots found.</p>
                )}

                <div className="mt-6">
                  <label className="block text-gray-700 font-semibold mb-3">Duration (hours)</label>
                  <input type="number" name="durationHours" className="w-full p-4 border-2 border-gray-300 rounded-lg" min="1" step="1" required />
                </div>

                <button type="submit" className="w-full mt-6 bg-blue-600 text-white px-6 py-4 rounded-lg font-bold text-lg">
                  Book Now
                </button>
              </form>
            </div>
          )}

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
                    <div key={h.id} className="bg-white p-6 rounded-2xl shadow-lg border-l-4 border-blue-500">
                      <div className="grid grid-cols-5 gap-4 items-center">
                        <div>
                          <p className="text-gray-500 text-sm font-semibold">Vehicle</p>
                          <p className="text-xl font-bold text-blue-600">{h.license_plate}</p>
                        </div>

                        <div>
                          <p className="text-gray-500 text-sm font-semibold">Location</p>
                          <p className="text-lg text-gray-800 font-semibold flex items-center gap-1">
                            <MapPinIcon size={18} /> {h.slot_number || h.location}
                          </p>
                        </div>

                        <div>
                          <p className="text-gray-500 text-sm font-semibold">Date & Time</p>
                          <p className="text-sm text-gray-700">
                            {new Date(h.start_time).toLocaleDateString()} {new Date(h.start_time).toLocaleTimeString()}
                          </p>
                        </div>

                        <div>
                          <p className="text-gray-500 text-sm font-semibold">Details</p>
                          <p className="text-gray-800 font-semibold">{Math.round((h.durationMins || 0) / 60)} hours</p>
                          <p className="text-green-600 font-bold">{h.amount} AED</p>
                        </div>

                        <div className="text-center">
                          <p className="text-gray-500 text-sm font-semibold">Remaining</p>
                          <p className={`text-lg font-bold ${timeRemaining[h.id]?.includes('Expired') ? 'text-gray-500' : 'text-green-600'}`}>
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

          {view === 'vehicles' && (
            <div>
              <h1 className="text-4xl font-bold text-gray-800 mb-8">Your Vehicles</h1>

              <div className="bg-white p-8 rounded-2xl shadow-lg mb-8 max-w-xl">
                <h2 className="text-2xl font-bold mb-4">Add Vehicle</h2>
                <input
                  type="text"
                  value={newPlate}
                  onChange={(e) => setNewPlate(e.target.value.toUpperCase())}
                  placeholder="e.g., A12345"
                  className="w-full p-4 border-2 border-gray-300 rounded-lg mb-4"
                />
                <button onClick={handleAddVehicle} className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold">
                  <Plus size={20} className="inline mr-2" /> Add Vehicle
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {vehicles.length === 0 ? (
                  <div className="bg-white p-12 rounded-2xl shadow-lg text-center col-span-2">
                    <Car className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">No vehicles registered yet.</p>
                  </div>
                ) : (
                  vehicles.map((v: any) => (
                    <div key={v.id} className="bg-white p-6 rounded-2xl shadow-lg border-l-4 border-purple-500">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-gray-500 text-sm">License Plate</p>
                          <p className="text-3xl font-bold text-purple-600">{v.plate || v.license_plate}</p>
                        </div>
                        <button onClick={() => handleDeleteVehicle(v.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {view === 'settings' && (
            <div>
              <h1 className="text-4xl font-bold text-gray-800 mb-8">Settings</h1>
              <div className="bg-white p-8 rounded-2xl shadow-lg max-w-xl">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">User Profile</h2>

                <label className="block text-gray-700 font-semibold mb-2">Full Name</label>
                <input type="text" value={userName || ''} disabled className="w-full p-4 border-2 border-gray-300 rounded-lg bg-gray-100 mb-4" />

                <label className="block text-gray-700 font-semibold mb-2">Email</label>
                <input type="email" value={localStorage.getItem('userEmail') || ''} disabled className="w-full p-4 border-2 border-gray-300 rounded-lg bg-gray-100" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
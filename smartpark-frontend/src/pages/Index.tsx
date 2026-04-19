import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Car, History, LayoutDashboard, LogOut, Settings, MapPin, Plus, Trash2, Clock, TrendingUp, Users, Shield, Banknote } from 'lucide-react';
import { useAuth } from '../AuthContext';

const Index = () => {
  const [view, setView] = useState('dashboard');
  const [slots, setSlots] = useState([]);
  const [history, setHistory] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [newPlate, setNewPlate] = useState('');
  const [timeRemaining, setTimeRemaining] = useState<{ [key: number]: string }>({});
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [duration, setDuration] = useState<number>(1);
  const [totalCost, setTotalCost] = useState<number>(0);
  
  const { logout, userId, userName } = useAuth();
  const navigate = useNavigate();

  // Calculate statistics
  const activeBookings = history.filter((h: any) => new Date(h.end_time).getTime() > new Date().getTime()).length;
  const availableSlots = slots.filter((s: any) => s.available).length;
  const totalSpent = history.reduce((sum: number, h: any) => sum + Number(h.amount || 0), 0);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // 1. Fetch Data from Backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const { latitude, longitude } = position.coords;
              fetch(`https://smartpark-backend-rmc1.onrender.com/api/slots?lat=${latitude}&lng=${longitude}`)
                .then(res => res.json())
                .then(data => {
                  if (data.success && data.slots && data.slots.length > 0) {
                    setSlots(data.slots);
                  } else {
                    // Fallback to demo slots if backend is empty
                    setSlots([
                      { id: 101, slot_number: 'A-01', location: 'SmartPark', zone_name: 'A', hourly_rate: 5.00, available: 1 },
                      { id: 102, slot_number: 'A-02', location: 'SmartPark', zone_name: 'A', hourly_rate: 5.00, available: 1 },
                      { id: 201, slot_number: 'B-01', location: 'SmartPark', zone_name: 'B', hourly_rate: 3.50, available: 1 },
                      { id: 301, slot_number: 'C-01', location: 'SmartPark', zone_name: 'C', hourly_rate: 2.50, available: 1 },
                      { id: 401, slot_number: 'D-01', location: 'SmartPark', zone_name: 'D', hourly_rate: 2.00, available: 1 }
                    ]);
                  }
                });
            },
            () => {
              fetch('https://smartpark-backend-rmc1.onrender.com/api/slots')
                .then(res => res.json())
                .then(data => {
                  if (data.success && data.slots && data.slots.length > 0) {
                    setSlots(data.slots);
                  } else {
                    setSlots([
                      { id: 101, slot_number: 'A-01', location: 'SmartPark', zone_name: 'A', hourly_rate: 5.00, available: 1 },
                      { id: 201, slot_number: 'B-01', location: 'SmartPark', zone_name: 'B', hourly_rate: 3.50, available: 1 },
                      { id: 301, slot_number: 'C-01', location: 'SmartPark', zone_name: 'C', hourly_rate: 2.50, available: 1 },
                      { id: 401, slot_number: 'D-01', location: 'SmartPark', zone_name: 'D', hourly_rate: 2.00, available: 1 }
                    ]);
                  }
                });
            }
          );
        } else {
          fetch('https://smartpark-backend-rmc1.onrender.com/api/slots')
            .then(res => res.json())
            .then(data => {
              if (data.success && data.slots && data.slots.length > 0) {
                setSlots(data.slots);
              } else {
                setSlots([
                  { id: 101, slot_number: 'A-01', location: 'SmartPark', zone_name: 'A', hourly_rate: 5.00, available: 1 },
                  { id: 201, slot_number: 'B-01', location: 'SmartPark', zone_name: 'B', hourly_rate: 3.50, available: 1 },
                  { id: 301, slot_number: 'C-01', location: 'SmartPark', zone_name: 'C', hourly_rate: 2.50, available: 1 },
                  { id: 401, slot_number: 'D-01', location: 'SmartPark', zone_name: 'D', hourly_rate: 2.00, available: 1 }
                ]);
              }
            });
        }
        const vehRes = await fetch(`https://smartpark-backend-rmc1.onrender.com/api/vehicles/${userId}`);
        const vehData = await vehRes.json();
        if (vehData.success) setVehicles(vehData.vehicles);
        
        const histRes = await fetch(`https://smartpark-backend-rmc1.onrender.com/api/history/${userId}`);
        const histData = await histRes.json();
        if (histData.success) setHistory(histData.history);
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

  // 3. Handle slot selection and calculate cost
  const handleSlotChange = (slotId: string) => {
    const slot = slots.find((s: any) => s.id === Number(slotId));
    setSelectedSlot(slot);
    calculateTotalCost(slot, duration);
  };

  // 4. Handle duration change and calculate cost
  const handleDurationChange = (newDuration: number) => {
    setDuration(newDuration);
    calculateTotalCost(selectedSlot, newDuration);
  };

  // 5. Get zone color for display
  const getZoneColor = (zoneName: string) => {
    switch(zoneName) {
      case 'A': return 'bg-red-50 text-red-700 border-red-200';
      case 'B': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'C': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'D': return 'bg-green-50 text-green-700 border-green-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  // 6. Calculate total cost
  const calculateTotalCost = (slot: any, hrs: number) => {
    if (slot && hrs) {
      setTotalCost(slot.hourly_rate * hrs);
    } else {
      setTotalCost(0);
    }
  };

  // 7. Extend Booking Function
  const handleExtendBooking = async (bookingId: number) => {
    const additionalHours = prompt('How many additional hours would you like to add? (Minimum 1 hour)');
    
    if (!additionalHours || isNaN(Number(additionalHours)) || Number(additionalHours) < 1) {
      alert('Please enter a valid number of hours (minimum 1 hour)');
      return;
    }
    
    try {
      const res = await fetch('https://smartpark-backend-rmc1.onrender.com/api/extend-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: bookingId,
          additionalHours: Number(additionalHours),
          userId: userId
        })
      });
      
      if (res.ok) {
        const result = await res.json();
        if (result.success) {
          alert(`Booking extended successfully!\n\nOriginal cost: ${result.originalCost?.toFixed(2)} AED\nAdditional cost: ${result.additionalCost?.toFixed(2)} AED\nNew total cost: ${result.newTotalCost?.toFixed(2)} AED`);
          window.location.reload();
        } else {
          alert(result.message || "Failed to extend booking");
        }
      } else {
        alert("Failed to extend booking. Please try again.");
      }
    } catch (err) {
      alert("Error extending booking. Please try again.");
    }
  };

  // 8. Booking Function
  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const durationHours = Number(formData.get('duration'));
    
    const bookingDetails = {
      userId: userId,
      vehicleId: formData.get('vehicleId'),
      slotId: formData.get('slotId'),
      durationMins: durationHours * 60,
      amount: totalCost
    };

    const res = await fetch('https://smartpark-backend-rmc1.onrender.com/api/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookingDetails)
    });

    if (res.ok) {
      const result = await res.json();
      if (result.success) {
        alert("Parking Reserved Successfully!");
        setView('history');
        window.location.reload();
      } else {
        alert(result.message || "Booking failed. Please try again.");
      }
    } else {
      try {
        const result = await res.json();
        alert(result.message || "Booking failed. Please try again.");
      } catch (e) {
        alert("Booking failed. Please try again.");
      }
    }
  };

  // 4. Add Vehicle Function
  const handleAddVehicle = async () => {
    if (!newPlate.trim()) {
      alert('Please enter a license plate');
      return;
    }

    try {
      const res = await fetch('https://smartpark-backend-rmc1.onrender.com/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, licensePlate: newPlate.toUpperCase() })
      });

      if (res.ok) {
        setNewPlate('');
        const vehRes = await fetch(`https://smartpark-backend-rmc1.onrender.com/api/vehicles/${userId}`);
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
      const res = await fetch(`https://smartpark-backend-rmc1.onrender.com/api/vehicles/${vehicleId}`, {
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
    <div className="flex h-screen bg-slate-50 font-sans">
      {/* Sidebar - Light Theme */}
      <div className="w-64 bg-white shadow-lg border-r border-slate-100 flex flex-col z-10 shrink-0">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <MapPin className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">SmartPark</h2>
          </div>
          <p className="text-slate-500 text-sm font-medium">Welcome, {userName}</p>
        </div>
        <nav className="flex-1 overflow-y-auto mt-4 space-y-1 p-4">
          <button 
            onClick={() => setView('dashboard')} 
            className={`w-full flex items-center p-3 rounded-xl transition-all duration-200 ${view === 'dashboard' ? 'bg-blue-50 text-blue-600 font-semibold shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-blue-600'}`}
          >
            <LayoutDashboard className="mr-3" size={20} /> Dashboard
          </button>
          <button 
            onClick={() => setView('booking')} 
            className={`w-full flex items-center p-3 rounded-xl transition-all duration-200 ${view === 'booking' ? 'bg-blue-50 text-blue-600 font-semibold shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-blue-600'}`}
          >
            <MapPin className="mr-3" size={20} /> Book Parking
          </button>
          <button 
            onClick={() => setView('history')} 
            className={`w-full flex items-center p-3 rounded-xl transition-all duration-200 ${view === 'history' ? 'bg-blue-50 text-blue-600 font-semibold shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-blue-600'}`}
          >
            <History className="mr-3" size={20} /> History
          </button>
          <button 
            onClick={() => setView('vehicles')} 
            className={`w-full flex items-center p-3 rounded-xl transition-all duration-200 ${view === 'vehicles' ? 'bg-blue-50 text-blue-600 font-semibold shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-blue-600'}`}
          >
            <Car className="mr-3" size={20} /> Vehicles
          </button>
          <button 
            onClick={() => setView('settings')} 
            className={`w-full flex items-center p-3 rounded-xl transition-all duration-200 ${view === 'settings' ? 'bg-blue-50 text-blue-600 font-semibold shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-blue-600'}`}
          >
            <Settings className="mr-3" size={20} /> Settings
          </button>
        </nav>
        <div className="p-4 border-t border-slate-100">
          <button 
            onClick={handleLogout} 
            className="w-full flex items-center p-3 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all duration-200 font-medium"
          >
            <LogOut className="mr-3" size={20} /> Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
        
        {/* Top Banner */}
        <div className="relative h-48 bg-emerald-600 shrink-0 shadow-sm">
          <img 
            src="https://images.unsplash.com/photo-1506521781263-d8422e82f27a?q=80&w=2070&auto=format&fit=crop" 
            alt="Parking Structure" 
            className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-emerald-900/50 to-transparent"></div>
          <div className="absolute bottom-0 left-0 p-8 w-full flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2 drop-shadow-md">
                Find and book parking with SmartPark
              </h1>
              <p className="text-emerald-50 text-lg opacity-90 drop-shadow-sm">Your modern parking companion</p>
            </div>
            <div className="hidden md:flex gap-4">
               {/* Quick stat chips for banner */}
               <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 text-white shadow-sm">
                 <p className="text-xs uppercase tracking-wide opacity-80">Available</p>
                 <p className="font-bold text-xl">{availableSlots} Slots</p>
               </div>
            </div>
          </div>
        </div>

        {/* Scrollable Area */}
        <div className="flex-1 overflow-auto p-8">
          
          {/* Dashboard View */}
          {view === 'dashboard' && (
            <div className="max-w-6xl mx-auto space-y-8">
              <h1 className="text-3xl font-bold text-slate-800">Overview</h1>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow flex justify-between items-center group">
                  <div>
                    <p className="text-slate-500 text-sm font-semibold uppercase tracking-wider mb-1">Available Slots</p>
                    <p className="text-4xl font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{availableSlots}</p>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-2xl">
                    <MapPin className="w-8 h-8 text-blue-500" />
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow flex justify-between items-center group">
                  <div>
                    <p className="text-slate-500 text-sm font-semibold uppercase tracking-wider mb-1">Your Vehicles</p>
                    <p className="text-4xl font-bold text-slate-800 group-hover:text-purple-600 transition-colors">{vehicles.length}</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-2xl">
                    <Car className="w-8 h-8 text-purple-500" />
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow flex justify-between items-center group">
                  <div>
                    <p className="text-slate-500 text-sm font-semibold uppercase tracking-wider mb-1">Active Bookings</p>
                    <p className="text-4xl font-bold text-slate-800 group-hover:text-green-600 transition-colors">{activeBookings}</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-2xl">
                    <History className="w-8 h-8 text-green-500" />
                  </div>
                </div>
              </div>

              {/* Quick Actions & Spend */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><TrendingUp size={20} className="text-blue-600"/> Quick Actions</h3>
                    <div className="space-y-4">
                      <button
                        onClick={() => setView('booking')}
                        className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 hover:shadow-md transition-all duration-200"
                      >
                        <MapPin className="mr-2" size={20} />
                        Book New Parking
                      </button>
                      <button
                        onClick={() => setView('vehicles')}
                        className="w-full flex items-center justify-center px-4 py-3 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition-all duration-200"
                      >
                        <Car className="mr-2" size={20} />
                        Manage Vehicles
                      </button>
                    </div>
                 </div>

                 <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center items-center text-center">
                    <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-4">
                      <span className="text-2xl font-bold">Dhs</span>
                    </div>
                    <p className="text-slate-500 text-sm font-semibold uppercase tracking-wider mb-2">Total Spent Lifetime</p>
                    <h2 className="text-5xl font-bold text-slate-800 mb-2">{totalSpent.toFixed(2)}<span className="text-2xl text-slate-500 ml-2 font-medium">AED</span></h2>
                    <p className="text-slate-400 text-sm">Across {history.length} total bookings</p>
                 </div>
              </div>
            </div>
          )}

          {/* Booking View */}
          {view === 'booking' && (
            <div className="max-w-4xl mx-auto space-y-8">
              <h1 className="text-3xl font-bold text-slate-800">Book Parking</h1>
              
              {/* Zone Pricing Information */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><Banknote size={20} className="text-blue-600"/> Zone Pricing Structure</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className={`p-4 rounded-xl border-2 ${getZoneColor('A')}`}>
                    <div className="text-center">
                      <p className="font-bold text-lg mb-1">Zone A</p>
                      <p className="text-xs uppercase tracking-wider opacity-80 mb-2">Premium</p>
                      <p className="text-xl font-bold">5 AED<span className="text-sm font-normal opacity-80">/hr</span></p>
                    </div>
                  </div>
                  <div className={`p-4 rounded-xl border-2 ${getZoneColor('B')}`}>
                    <div className="text-center">
                      <p className="font-bold text-lg mb-1">Zone B</p>
                      <p className="text-xs uppercase tracking-wider opacity-80 mb-2">Mid-High</p>
                      <p className="text-xl font-bold">3.5 AED<span className="text-sm font-normal opacity-80">/hr</span></p>
                    </div>
                  </div>
                  <div className={`p-4 rounded-xl border-2 ${getZoneColor('C')}`}>
                    <div className="text-center">
                      <p className="font-bold text-lg mb-1">Zone C</p>
                      <p className="text-xs uppercase tracking-wider opacity-80 mb-2">Mid-Low</p>
                      <p className="text-xl font-bold">2.5 AED<span className="text-sm font-normal opacity-80">/hr</span></p>
                    </div>
                  </div>
                  <div className={`p-4 rounded-xl border-2 ${getZoneColor('D')}`}>
                    <div className="text-center">
                      <p className="font-bold text-lg mb-1">Zone D</p>
                      <p className="text-xs uppercase tracking-wider opacity-80 mb-2">Economy</p>
                      <p className="text-xl font-bold">2 AED<span className="text-sm font-normal opacity-80">/hr</span></p>
                    </div>
                  </div>
                </div>
              </div>
              
              <form onSubmit={handleBooking} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                <h2 className="text-xl font-bold text-slate-800 mb-6">Reservation Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-2 flex items-center gap-2"><Car size={18}/> Select Vehicle</label>
                    <select name="vehicleId" className="w-full p-3.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all bg-slate-50 hover:bg-white" required>
                      <option value="">-- Choose a vehicle --</option>
                      {vehicles.map((v: any) => <option key={v.id} value={v.id}>{v.make || ''} {v.model || ''} ({v.plate || v.license_plate || 'No Plate'})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-2 flex items-center gap-2"><MapPin size={18}/> Select Slot</label>
                    <select 
                      name="slotId" 
                      className="w-full p-3.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all bg-slate-50 hover:bg-white" 
                      required
                      onChange={(e) => handleSlotChange(e.target.value)}
                    >
                      {!slots || slots.filter((s: any) => s.available == 1 || s.available == true).length === 0 ? (
                        <option disabled>No available slots found in database</option>
                      ) : (
                        slots.filter((s: any) => s.available == 1 || s.available == true).map((s: any) => (
                          <option key={s.id} value={s.id}>
                            Zone {s.zone_name || '?'} - Slot {s.slot_number} ({s.hourly_rate || '0'} AED/hr)
                            {s.distance && ` - ${s.distance.toFixed(1)} km away`}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>
                <div className="mt-6">
                  <label className="block text-slate-700 font-semibold mb-2 flex items-center gap-2"><Clock size={18}/> Duration (hours)</label>
                  <input 
                    type="number" 
                    name="duration" 
                    className="w-full p-3.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all bg-slate-50 hover:bg-white" 
                    min="1" 
                    step="1" 
                    required 
                    onChange={(e) => handleDurationChange(Number(e.target.value))}
                  />
                  <p className="text-sm text-slate-500 mt-2">Minimum duration: 1 hour</p>
                </div>
                
                {/* Pricing Display */}
                {(totalCost > 0 || duration > 0) && (
                  <div className="mt-8 p-6 bg-blue-50 rounded-xl border border-blue-100 flex justify-between items-center">
                    <div>
                      <p className="text-sm text-blue-600/80 font-bold uppercase tracking-wider mb-1">Estimated Total</p>
                      <p className="text-3xl font-extrabold text-blue-700">{totalCost.toFixed(2)} AED</p>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-700 font-medium">Zone {selectedSlot?.zone_name} - {duration} hour{duration > 1 ? 's' : ''}</p>
                      <p className="text-sm text-slate-500">{selectedSlot?.hourly_rate} AED/hr rate</p>
                    </div>
                  </div>
                )}
                <button type="submit" className="w-full mt-8 bg-blue-600 text-white px-6 py-4 rounded-xl hover:bg-blue-700 hover:shadow-lg hover:-translate-y-0.5 font-bold text-lg transition-all duration-200 flex items-center justify-center gap-2">
                  <Shield size={20} /> Complete Booking
                </button>
              </form>
            </div>
          )}

          {/* History View */}
          {view === 'history' && (
            <div className="max-w-5xl mx-auto space-y-8">
              <h1 className="text-3xl font-bold text-slate-800">Booking History</h1>
              {history.length === 0 ? (
                <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-100 text-center">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <History className="w-10 h-10 text-slate-300" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-700 mb-2">No bookings yet</h3>
                  <p className="text-slate-500">Start by booking your first parking slot!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {history.map((h: any) => (
                    <div key={h.id} className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-slate-100 relative overflow-hidden group">
                      {/* Status indicator bar */}
                      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${timeRemaining[h.id]?.includes('Expired') ? 'bg-slate-300' : 'bg-blue-500'}`}></div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-6 gap-6 items-center pl-4">
                        <div>
                          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Vehicle</p>
                          <div className="inline-flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                            <Car className="text-slate-600" size={16} />
                            <span className="font-bold text-slate-800 font-mono tracking-wide">{h.license_plate}</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Location</p>
                          <p className="text-lg text-slate-800 font-bold">{h.slot_number}</p>
                          <p className="text-sm text-slate-500">{h.location}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Date & Time</p>
                          <p className="text-slate-800 font-medium">{new Date(h.start_time).toLocaleDateString()}</p>
                          <p className="text-sm text-slate-500">{new Date(h.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Details</p>
                          <p className="text-slate-800 font-medium">{Math.ceil(h.durationMins / 60)} hours</p>
                          <p className="text-sm font-bold text-green-600">{h.amount} AED</p>
                        </div>
                        <div className="text-center bg-slate-50 py-3 rounded-xl border border-slate-100">
                          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Remaining</p>
                          <p className={`font-mono font-bold ${timeRemaining[h.id]?.includes('Expired') ? 'text-slate-400' : 'text-blue-600'}`}>
                            {timeRemaining[h.id] || '...'}
                          </p>
                        </div>
                        <div className="text-right">
                          {!timeRemaining[h.id]?.includes('Expired') && (
                            <button
                              onClick={() => handleExtendBooking(h.id)}
                              className="px-4 py-2 bg-white text-blue-600 border border-blue-200 text-sm rounded-xl hover:bg-blue-50 hover:border-blue-300 transition-colors font-bold"
                            >
                              Extend Time
                            </button>
                          )}
                          {timeRemaining[h.id]?.includes('Expired') && (
                            <span className="inline-block px-3 py-1 bg-slate-100 text-slate-500 text-xs font-bold uppercase rounded-lg border border-slate-200">
                              Completed
                            </span>
                          )}
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
            <div className="max-w-5xl mx-auto space-y-8">
              <h1 className="text-3xl font-bold text-slate-800">Your Vehicles</h1>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Add Vehicle Form */}
                <div className="lg:col-span-1">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 sticky top-0">
                    <h2 className="text-xl font-bold text-slate-800 mb-6">Add New Vehicle</h2>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-slate-700 font-semibold mb-2">License Plate</label>
                        <input
                          type="text"
                          value={newPlate}
                          onChange={(e) => setNewPlate(e.target.value.toUpperCase())}
                          placeholder="e.g., ABC-123"
                          className="w-full p-3.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all bg-slate-50 hover:bg-white"
                        />
                      </div>
                      <button
                        onClick={handleAddVehicle}
                        className="w-full bg-blue-600 text-white px-6 py-3.5 rounded-xl hover:bg-blue-700 hover:shadow-md transition-all duration-200 font-bold flex items-center justify-center gap-2"
                      >
                        <Plus size={20} /> Register Vehicle
                      </button>
                    </div>
                  </div>
                </div>

                {/* Vehicle List */}
                <div className="lg:col-span-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {vehicles.length === 0 ? (
                      <div className="col-span-2 bg-white p-12 rounded-2xl shadow-sm border border-slate-100 text-center">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Car className="w-10 h-10 text-slate-300" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-700 mb-2">Garage is empty</h3>
                        <p className="text-slate-500">Add your first vehicle to start booking.</p>
                      </div>
                    ) : (
                      vehicles.map((v: any) => (
                        <div key={v.id} className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-slate-100 relative overflow-hidden group">
                          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-500"></div>
                          <div className="pl-2">
                            <div className="flex justify-between items-start mb-4">
                              <div className="inline-block bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                                <p className="text-xl font-bold text-slate-800 font-mono tracking-widest">{v.plate || v.license_plate || 'No Plate'}</p>
                              </div>
                              <button
                                onClick={() => handleDeleteVehicle(v.id)}
                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                                title="Remove Vehicle"
                              >
                                <Trash2 size={20} />
                              </button>
                            </div>
                            <p className="text-slate-600 font-medium">{v.make} {v.model}</p>
                            <p className="text-slate-400 text-sm mt-1">Added recently</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Settings View */}
          {view === 'settings' && (
            <div className="max-w-4xl mx-auto space-y-8">
              <h1 className="text-3xl font-bold text-slate-800">Account Settings</h1>
              
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2"><Users size={20} className="text-blue-600"/> Profile Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-2">Full Name</label>
                    <input type="text" value={userName} disabled className="w-full p-3.5 border-2 border-slate-200 rounded-xl bg-slate-50 text-slate-500 cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-2">Email Address</label>
                    <input type="email" value={localStorage.getItem('userEmail') || ''} disabled className="w-full p-3.5 border-2 border-slate-200 rounded-xl bg-slate-50 text-slate-500 cursor-not-allowed" />
                  </div>
                </div>
              </div>

              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2"><Settings size={20} className="text-blue-600"/> Notification Preferences</h2>
                <div className="space-y-3">
                  <label className="flex items-center p-4 bg-slate-50 border border-slate-100 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                    <input type="checkbox" className="mr-4 w-5 h-5 rounded text-blue-600 focus:ring-blue-500" defaultChecked={true} />
                    <div>
                      <span className="block text-slate-800 font-bold">Booking Alerts</span>
                      <span className="text-slate-500 text-sm">Receive notifications about upcoming reservations</span>
                    </div>
                  </label>
                  <label className="flex items-center p-4 bg-slate-50 border border-slate-100 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                    <input type="checkbox" className="mr-4 w-5 h-5 rounded text-blue-600 focus:ring-blue-500" defaultChecked={true} />
                    <div>
                      <span className="block text-slate-800 font-bold">Promotional Offers</span>
                      <span className="text-slate-500 text-sm">Get discounts and news about SmartPark</span>
                    </div>
                  </label>
                </div>
                <button
                  onClick={() => alert('Preferences saved!')}
                  className="mt-8 bg-blue-600 text-white px-8 py-3.5 rounded-xl hover:bg-blue-700 hover:shadow-md transition-all duration-200 font-bold"
                >
                  Save Preferences
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

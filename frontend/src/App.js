import React, { useState, useEffect } from 'react';
import { Search, Users, MessageSquare, Calendar, Settings, Send, Filter, Download, Eye, Phone, Check, X, Clock } from 'lucide-react';

// API configuration
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [guests, setGuests] = useState([]);
  const [selectedGuest, setSelectedGuest] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState({});
  const [weddingId] = useState('default-wedding-id'); // In production, this would be dynamic

  // Fetch guests data
  useEffect(() => {
    fetchGuests();
    fetchAnalytics();
  }, [weddingId]);

  const fetchGuests = async () => {
    try {
      const response = await fetch(`${API_URL}/guests`);
      const data = await response.json();
      setGuests(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching guests:', error);
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      // For now, calculate analytics from guests data
      const confirmed = guests.filter(g => g.rsvpStatus === 'YES').length;
      const declined = guests.filter(g => g.rsvpStatus === 'NO').length;
      const totalGuestCount = guests
        .filter(g => g.rsvpStatus === 'YES')
        .reduce((sum, g) => sum + (g.guestCount || 0), 0);
      
      setAnalytics({
        confirmed,
        declined,
        totalGuestCount
      });
    } catch (error) {
      console.error('Error calculating analytics:', error);
    }
  };

  const fetchGuestDetails = async (guestId) => {
    try {
      const response = await fetch(`${API_URL}/guests/${guestId}`);
      const data = await response.json();
      setSelectedGuest(data);
    } catch (error) {
      console.error('Error fetching guest details:', error);
    }
  };

  // Filter guests based on search and status
  const filteredGuests = guests.filter(guest => {
    const matchesSearch = !searchTerm || 
      guest.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      guest.phoneNumber.includes(searchTerm);
    
    const matchesFilter = filterStatus === 'all' || 
      (filterStatus === 'confirmed' && guest.rsvpStatus === 'YES') ||
      (filterStatus === 'declined' && guest.rsvpStatus === 'NO') ||
      (filterStatus === 'pending' && !guest.rsvpStatus);
    
    return matchesSearch && matchesFilter;
  });

  // Overview Stats Component
  const OverviewStats = () => {
    const totalInvited = guests.length;
    const confirmed = guests.filter(g => g.rsvpStatus === 'YES').length;
    const declined = guests.filter(g => g.rsvpStatus === 'NO').length;
    const pending = guests.filter(g => !g.rsvpStatus).length;
    const totalGuestCount = guests
      .filter(g => g.rsvpStatus === 'YES')
      .reduce((sum, g) => sum + (g.guestCount || 0), 0);

    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Invited</p>
              <p className="text-2xl font-bold text-gray-900">{totalInvited}</p>
            </div>
            <Users className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Confirmed</p>
              <p className="text-2xl font-bold text-green-600">{confirmed}</p>
              <p className="text-xs text-gray-500">{totalGuestCount} total guests</p>
            </div>
            <Check className="w-8 h-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Declined</p>
              <p className="text-2xl font-bold text-red-600">{declined}</p>
            </div>
            <X className="w-8 h-8 text-red-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{pending}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
      </div>
    );
  };

  // Guest List Component
  const GuestList = () => (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name or phone..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <select
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Guests</option>
            <option value="confirmed">Confirmed</option>
            <option value="declined">Declined</option>
            <option value="pending">Pending</option>
          </select>
          
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">RSVP</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guests</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Arrival</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transport</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredGuests.map((guest) => (
              <tr key={guest.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{guest.name || 'Not provided'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{guest.phoneNumber}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {guest.rsvpStatus === 'YES' && (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      Confirmed
                    </span>
                  )}
                  {guest.rsvpStatus === 'NO' && (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                      Declined
                    </span>
                  )}
                  {!guest.rsvpStatus && (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                      Pending
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {guest.guestCount || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {guest.arrivalDateTime || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {guest.transportMode || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button 
                    onClick={() => fetchGuestDetails(guest.id)}
                    className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // Guest Details Modal
  const GuestDetailsModal = () => {
    if (!selectedGuest) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
          <div className="p-6 border-b flex justify-between items-center">
            <h2 className="text-xl font-semibold">Guest Details: {selectedGuest.name || 'Guest'}</h2>
            <button 
              onClick={() => setSelectedGuest(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-4">Guest Information</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Phone Number</p>
                  <p className="font-medium">{selectedGuest.phoneNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">RSVP Status</p>
                  <p className="font-medium">{selectedGuest.rsvpStatus || 'Pending'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Number of Guests</p>
                  <p className="font-medium">{selectedGuest.guestCount || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Dietary Restrictions</p>
                  <p className="font-medium">{selectedGuest.dietaryRestrictions || 'None'}</p>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900 mb-4">Conversation History</h3>
              <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto space-y-3">
                {selectedGuest.conversations?.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-xs px-4 py-2 rounded-lg ${
                      msg.role === 'assistant' 
                        ? 'bg-white border border-gray-200' 
                        : 'bg-blue-600 text-white'
                    }`}>
                      <p className="text-sm">{msg.content}</p>
                      <p className={`text-xs mt-1 ${
                        msg.role === 'assistant' ? 'text-gray-500' : 'text-blue-100'
                      }`}>
                        {new Date(msg.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-2xl font-bold text-gray-900">Wedding Bot Admin</h1>
            <div className="flex gap-4">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-2 rounded-lg ${activeTab === 'overview' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('guests')}
                className={`px-4 py-2 rounded-lg ${activeTab === 'guests' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                Guests
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && <OverviewStats />}
            <GuestList />
            <GuestDetailsModal />
          </>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:5000';

const App = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [sessions, setSessions] = useState([]);
  const [qrCode, setQrCode] = useState('');
  const [selectedPhone, setSelectedPhone] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [phoneToDelete, setPhoneToDelete] = useState('');

  useEffect(() => {
    // Fetch registered devices on component mount
    fetchRegisteredDevices();
  }, []);

  const fetchRegisteredDevices = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/get-registered-devices`);
      setSessions(res.data);
    } catch (error) {
      console.error('Error fetching registered devices:', error.message);
      alert('Failed to fetch registered devices. Please check the backend.');
    }
  };

  const addPhone = async () => {
    try {
      const res = await axios.post(`${API_BASE_URL}/add-phone`, { phoneNumber });
      setQrCode(res.data.qr);
      setSessions([...sessions, { phoneNumber, isConnected: false }]);
      setPhoneNumber(''); // Clear input field
    } catch (error) {
      console.error('Error adding phone:', error.message);
      alert('Failed to add phone. Please check the backend.');
    }
  };

  const handleDeleteClick = (phone) => {
    setPhoneToDelete(phone);
    setShowDeleteModal(true);
  };

  const deletePhone = async () => {
    try {
      await axios.delete(`${API_BASE_URL}/delete-phone/${phoneToDelete}`);
      setSessions(sessions.filter((p) => p.phoneNumber !== phoneToDelete));
      if (selectedPhone === phoneToDelete) setQrCode(''); // Clear QR code if deleted
      setShowDeleteModal(false);
      setPhoneToDelete('');
    } catch (error) {
      console.error('Error deleting phone:', error.message);
      alert('Failed to delete phone. Please check the backend.');
    }
  };

  const fetchQRCode = async (phone) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/get-qr/${phone}`);
      setQrCode(res.data.qr);
      setSelectedPhone(phone);
    } catch (error) {
      console.error('Error fetching QR code:', error.message);
      alert('Failed to fetch QR code. Please check the backend.');
    }
  };

  // Filter sessions based on search query and status filter
  const filteredSessions = sessions.filter(session => {
    const matchesSearch = session.phoneNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'connected' && session.isConnected) ||
      (statusFilter === 'disconnected' && !session.isConnected);
    return matchesSearch && matchesStatus;
  });

  // Status badge component
  const StatusBadge = ({ isConnected }) => {
    const status = isConnected ? 'Connected' : 'Not Connected';
    const backgroundColor = isConnected ? '#d4edda' : '#f8d7da';
    const textColor = isConnected ? '#155724' : '#721c24';
    const borderColor = isConnected ? '#c3e6cb' : '#f5c6cb';

    return (
      <span
        style={{
          display: 'inline-block',
          padding: '6px 12px',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: '600',
          backgroundColor,
          color: textColor,
          border: `1px solid ${borderColor}`,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
        }}
      >
        {status}
      </span>
    );
  };

  // Confirmation Modal component
  const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message }) => {
    if (!isOpen) return null;

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '24px',
          borderRadius: '12px',
          width: '400px',
          maxWidth: '90%',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
        }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#1a1a1a', fontSize: '18px' }}>{title}</h3>
          <p style={{ margin: '0 0 24px 0', color: '#4a4a4a', fontSize: '14px', lineHeight: '1.5' }}>{message}</p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              onClick={onClose}
              style={{
                padding: '8px 16px',
                backgroundColor: '#f8f9fa',
                color: '#495057',
                border: '1px solid #dee2e6',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s ease'
              }}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              style={{
                padding: '8px 16px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s ease'
              }}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ 
      padding: '32px', 
      fontFamily: 'system-ui, -apple-system, sans-serif',
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: '#f8f9fa'
    }}>
      <h1 style={{ 
        textAlign: 'center',
        color: '#1a1a1a',
        fontSize: '28px',
        marginBottom: '32px',
        fontWeight: '600'
      }}>
        WhatsApp Manager
      </h1>

      {/* Add Phone Section */}
      <div style={{ 
        marginBottom: '40px', 
        width: '50%',
        backgroundColor: 'white',
        padding: '16px',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
      }}>
        <div style={{ 
          display: 'flex',
          gap: '12px',
          alignItems: 'center'
        }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              type="text"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="Enter phone number (e.g., 628123456789)"
              style={{ 
                width: '95%',
                padding: '12px 16px',
                fontSize: '14px',
                border: '1px solid #dee2e6',
                borderRadius: '8px',
                transition: 'all 0.2s ease',
                outline: 'none',
                backgroundColor: '#f8f9fa',
                '&:focus': {
                  borderColor: '#007bff',
                  boxShadow: '0 0 0 3px rgba(0,123,255,0.15)'
                }
              }}
            />
          </div>
          <button
            onClick={addPhone}
            style={{
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: '500',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 4px rgba(40,167,69,0.2)',
              '&:hover': {
                backgroundColor: '#218838',
                transform: 'translateY(-1px)',
                boxShadow: '0 4px 8px rgba(40,167,69,0.3)'
              }
            }}
          >
            <span style={{ fontSize: '16px' }}>+</span>
            Add Device
          </button>
        </div>
      </div>

      {/* QR Code Section */}
      {qrCode && (
        <div style={{ 
          marginBottom: '32px', 
          textAlign: 'center',
          backgroundColor: 'white',
          padding: '16px',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          width: '50%'
        }}>
          <h2 style={{ 
            margin: '0 0 16px 0',
            fontSize: '18px',
            color: '#1a1a1a',
            fontWeight: '600'
          }}>
            Scan QR Code for {selectedPhone}
          </h2>
          <img
            src={qrCode}
            alt="QR Code"
            style={{
              display: 'block',
              margin: '0 auto',
              border: '1px solid #dee2e6',
              borderRadius: '8px',
              width: '200px',
              height: '200px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
            }}
          />
        </div>
      )}

      {/* Active Sessions Section */}
      <div style={{ width: '52%' }}>
        <h2 style={{ 
          textAlign: 'center',
          fontSize: '18px',
          color: '#1a1a1a',
          marginBottom: '20px',
          fontWeight: '600'
        }}>
          Registered Devices
        </h2>
        
        {/* Search and Filter Section */}
        <div style={{ 
          marginBottom: '24px', 
          display: 'flex', 
          gap: '12px',
          backgroundColor: 'white',
          padding: '16px',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
        }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search phone number..."
            style={{ 
              flex: 1,
              padding: '10px 16px',
              fontSize: '14px',
              border: '1px solid #dee2e6',
              borderRadius: '8px',
              backgroundColor: '#f8f9fa',
              outline: 'none',
              transition: 'all 0.2s ease',
              '&:focus': {
                borderColor: '#007bff',
                boxShadow: '0 0 0 3px rgba(0,123,255,0.15)'
              }
            }}
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '10px 16px',
              fontSize: '14px',
              border: '1px solid #dee2e6',
              borderRadius: '8px',
              backgroundColor: '#f8f9fa',
              outline: 'none',
              transition: 'all 0.2s ease',
              cursor: 'pointer',
              '&:focus': {
                borderColor: '#007bff',
                boxShadow: '0 0 0 3px rgba(0,123,255,0.15)'
              }
            }}
          >
            <option value="all">All Status</option>
            <option value="connected">Connected</option>
            <option value="disconnected">Disconnected</option>
          </select>
        </div>

        {filteredSessions.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '32px',
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
          }}>
            <p style={{ color: '#6c757d', fontSize: '14px', margin: 0 }}>No devices found</p>
          </div>
        ) : (
          <div style={{ 
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            overflow: 'hidden'
          }}>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse',
              fontSize: '14px'
            }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th style={{ 
                    padding: '16px', 
                    borderBottom: '1px solid #dee2e6',
                    textAlign: 'left',
                    fontWeight: '600',
                    color: '#495057'
                  }}>Phone Number</th>
                  <th style={{ 
                    padding: '16px', 
                    borderBottom: '1px solid #dee2e6',
                    textAlign: 'center',
                    fontWeight: '600',
                    color: '#495057'
                  }}>Status</th>
                  <th style={{ 
                    padding: '16px', 
                    borderBottom: '1px solid #dee2e6',
                    textAlign: 'center',
                    fontWeight: '600',
                    color: '#495057'
                  }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSessions.map((session, index) => (
                  <tr key={index} style={{
                    borderBottom: index !== filteredSessions.length - 1 ? '1px solid #dee2e6' : 'none',
                    '&:hover': {
                      backgroundColor: '#f8f9fa'
                    }
                  }}>
                    <td style={{ 
                      padding: '16px',
                      color: '#212529'
                    }}>{session.phoneNumber}</td>
                    <td style={{ 
                      padding: '16px',
                      textAlign: 'center'
                    }}>
                      <StatusBadge isConnected={session.isConnected} />
                    </td>
                    <td style={{ 
                      padding: '16px',
                      textAlign: 'center'
                    }}>
                      {!session.isConnected && (
                        <button
                          onClick={() => fetchQRCode(session.phoneNumber)}
                          style={{
                            marginRight: '8px',
                            padding: '6px 12px',
                            fontSize: '13px',
                            backgroundColor: '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              backgroundColor: '#0056b3',
                              transform: 'translateY(-1px)'
                            }
                          }}
                        >
                          Fetch QR
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteClick(session.phoneNumber)}
                        style={{
                          padding: '6px 12px',
                          fontSize: '13px',
                          backgroundColor: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            backgroundColor: '#c82333',
                            transform: 'translateY(-1px)'
                          }
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setPhoneToDelete('');
        }}
        onConfirm={deletePhone}
        title="Confirm Deletion"
        message={`Are you sure you want to delete ${phoneToDelete}? This action cannot be undone.`}
      />
    </div>
  );
};

export default App;

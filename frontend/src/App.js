import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000';

const App = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [sessions, setSessions] = useState([]);
  const [qrCode, setQrCode] = useState('');
  const [selectedPhone, setSelectedPhone] = useState('');

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

  const deletePhone = async (phone) => {
    try {
      await axios.delete(`${API_BASE_URL}/delete-phone/${phone}`);
      setSessions(sessions.filter((p) => p.phoneNumber !== phone));
      if (selectedPhone === phone) setQrCode(''); // Clear QR code if deleted
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

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
      <h1 style={{ textAlign: 'center' }}>WhatsApp Phone Manager</h1>

      {/* Add Phone Section */}
      <div style={{ marginBottom: '20px', textAlign: 'center' }}>
        <input
          type="text"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          placeholder="Enter Phone Number"
          style={{ padding: '10px', width: '300px', fontSize: '16px' }}
        />
        <button
          onClick={addPhone}
          style={{
            marginLeft: '10px',
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
          }}
        >
          Add Phone
        </button>
      </div>

      {/* QR Code Section */}
      {qrCode && (
        <div style={{ marginBottom: '20px', textAlign: 'center' }}>
          <h2>Scan QR Code for {selectedPhone}</h2>
          <img
            src={qrCode}
            alt="QR Code"
            style={{
              display: 'block',
              margin: '20px auto',
              border: '1px solid #dee2e6',
              borderRadius: '5px',
              width: '200px',
              height: '200px',
            }}
          />
        </div>
      )}

      {/* Active Sessions Section */}
      <h2 style={{ textAlign: 'center' }}>Registered Devices</h2>
      <table style={{ width: '50%', borderCollapse: 'collapse', marginTop: '10px' }}>
        <thead>
          <tr style={{ backgroundColor: '#f8f9fa' }}>
            <th style={{ padding: '10px', border: '1px solid #dee2e6' }}>Phone Number</th>
            <th style={{ padding: '10px', border: '1px solid #dee2e6' }}>Status</th>
            <th style={{ padding: '10px', border: '1px solid #dee2e6' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((session, index) => (
            <tr key={index}>
              <td style={{ padding: '10px', border: '1px solid #dee2e6' }}>{session.phoneNumber}</td>
              <td style={{ padding: '10px', border: '1px solid #dee2e6', textAlign: 'center' }}>
                <span style={{ color: session.isConnected ? '#28a745' : '#dc3545' }}>
                  {session.isConnected ? 'Connected' : 'Not Connected'}
                </span>
              </td>
              <td style={{ padding: '10px', border: '1px solid #dee2e6', textAlign: 'center' }}>
                {!session.isConnected && (
                  <button
                    onClick={() => fetchQRCode(session.phoneNumber)}
                    style={{
                      marginRight: '10px',
                      padding: '5px 10px',
                      fontSize: '14px',
                      backgroundColor: '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '5px',
                      cursor: 'pointer',
                    }}
                  >
                    Fetch QR
                  </button>
                )}
                <button
                  onClick={() => deletePhone(session.phoneNumber)}
                  style={{
                    padding: '5px 10px',
                    fontSize: '14px',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
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
  );
};

export default App;

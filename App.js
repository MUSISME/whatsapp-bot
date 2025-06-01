import React, { useState, useEffect } from 'react';
import axios from 'axios';

const App = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [sessions, setSessions] = useState([]);
  const [qrCode, setQrCode] = useState('');

  const addPhone = async () => {
    const res = await axios.post('/add-phone', { phoneNumber });
    setQrCode(res.data.qr);
    setSessions([...sessions, phoneNumber]);
  };

  const deletePhone = async (phone) => {
    await axios.delete(`/delete-phone/${phone}`);
    setSessions(sessions.filter((p) => p !== phone));
  };

  return (
    <div>
      <h1>WhatsApp Multi-Phone Manager</h1>
      <input 
        type="text" 
        value={phoneNumber} 
        onChange={(e) => setPhoneNumber(e.target.value)} 
        placeholder="Enter Phone Number" 
      />
      <button onClick={addPhone}>Add Phone</button>

      {qrCode && (
        <div>
          <h2>Scan this QR Code</h2>
          <pre>{qrCode}</pre>
        </div>
      )}

      <h2>Active Sessions</h2>
      <ul>
        {sessions.map((phone, index) => (
          <li key={index}>
            {phone}
            <button onClick={() => deletePhone(phone)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default App;

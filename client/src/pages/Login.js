
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const nav = useNavigate();
  return (
    <div style={{ maxWidth: 480, margin: '80px auto', border: '1px solid #ddd', padding: 24 }}>
      <h2>Business Metadata App</h2>
      <label>Username</label>
      <input value={u} onChange={e => setU(e.target.value)} style={{ width: '100%', marginBottom: 12 }} />
      <label>Password</label>
      <input type="password" value={p} onChange={e => setP(e.target.value)} style={{ width: '100%', marginBottom: 24 }} />
      <button onClick={() => nav('/main')}>Continue</button>
      <p style={{ color: '#888' }}>Dummy login: any input goes to next page.</p>
    </div>
  );
}

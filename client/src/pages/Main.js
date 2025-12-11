
import React, { useState } from 'react';
import ConfigModal from '../ui/ConfigModal';
import InputScreen from '../ui/InputScreen';

export default function Main() {
  const [configLevel, setConfigLevel] = useState(null);
  const [inputLevel, setInputLevel] = useState(null);

  return (
    <div>
      <div style={{ padding: 12, background: '#f6f6f6', borderBottom: '1px solid #ddd' }}>
        <strong>Business Metadata Management</strong>
      </div>

      <div style={{ display: 'flex', gap: 24, padding: 24 }}>
        <div style={{ flex: 1, border: '1px solid #ccc', padding: 16 }}>
          <h3>Business Metadata Configuration</h3>
          <div style={{ display: 'flex', gap: 12 }}>
            {['Catalog', 'Schema', 'Table', 'Column'].map(l => (
              <button key={l} onClick={() => setConfigLevel(l)}>{l}</button>
            ))}
          </div>
          <p style={{ color: '#777' }}>Click a level to open configuration.</p>
          {configLevel && <ConfigModal level={configLevel} onClose={() => setConfigLevel(null)} />}
        </div>

        <div style={{ flex: 1, border: '1px solid #ccc', padding: 16 }}>
          <h3>Input Business Metadata</h3>
          <div style={{ display: 'flex', gap: 12 }}>
            {['Catalog', 'Schema', 'Table', 'Column'].map(l => (
              <button key={l} onClick={() => setInputLevel(l)}>{l}</button>
            ))}
          </div>
          <p style={{ color: '#777' }}>Select level to input metadata.</p>
          {inputLevel && <InputScreen level={inputLevel} onClose={() => setInputLevel(null)} />}
        </div>
      </div>
    </div>
  );
}

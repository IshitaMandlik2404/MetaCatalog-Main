
import React, { useEffect, useState } from 'react';
import { getSubjects, getAttributeTypes, addConfig, updateConfig, deleteConfig } from '../api';

export default function ConfigModal({ level, onClose }) {
  const [subjects, setSubjects] = useState([]);
  const [subject, setSubject] = useState('');
  const [types, setTypes] = useState([]);
  const [attributeType, setAttributeType] = useState('');
  const [sno, setSno] = useState('');
  const [entityType, setEntityType] = useState(level.toLowerCase());

  useEffect(() => { getSubjects().then(setSubjects); }, []);
  useEffect(() => { subject ? getAttributeTypes(subject).then(setTypes) : setTypes([]); }, [subject]);

  const save = async () => { await addConfig({ sno, entity_type: entityType, subject, attribute_type: attributeType }); alert('Added'); };
  const modify = async () => { await updateConfig({ sno, entity_type: entityType, subject, attribute_type: attributeType }); alert('Updated'); };
  const remove = async () => { await deleteConfig({ sno }); alert('Deleted'); };

  return (
    <div style={{ borderTop: '1px solid #ddd', marginTop: 16, paddingTop: 16 }}>
      <h4>Configure: {level}</h4>
      <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr 2fr' }}>
        <label>Subject</label>
        <select value={subject} onChange={e => setSubject(e.target.value)}>
          <option value="">-- Select --</option>
          {subjects.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <label>Attribute Type</label>
        <select value={attributeType} onChange={e => setAttributeType(e.target.value)} disabled={!subject}>
          <option value="">-- Select --</option>
          {types.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        <label>S.No</label>
        <input value={sno} onChange={e => setSno(e.target.value)} placeholder="integer" />

        <label>Entity Type</label>
        <input value={entityType} onChange={e => setEntityType(e.target.value)} />
      </div>

      <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
        <button onClick={save}>Add</button>
        <button onClick={modify}>Modify</button>
        <button onClick={remove}>Delete</button>
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

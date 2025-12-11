
import React, { useEffect, useState } from 'react';
import { getEntities, getMetadataAttributes, getMetadata, upsertMetadata, deleteMetadata } from '../api';

export default function InputScreen({ level, onClose }) {
  const [entities, setEntities] = useState([]);
  const [entity, setEntity] = useState('');
  const [attributes, setAttributes] = useState([]);
  const [values, setValues] = useState({});

  useEffect(() => {
    getEntities(level).then(setEntities);
    getMetadataAttributes().then(setAttributes);
  }, [level]);

  useEffect(() => {
    if (!entity) return;
    getMetadata(level, entity).then(rows => {
      const kv = {};
      rows.forEach(r => { if (r.attr) kv[r.attr] = r.val; });
      setValues(kv);
    });
  }, [entity, level]);

  const setVal = (k, v) => setValues(s => ({ ...s, [k]: v }));

  const addOrModify = async () => { await upsertMetadata({ level, entity, attributes: values }); alert('Saved'); };
  const remove = async () => { await deleteMetadata({ level, entity }); alert('Deleted'); };

  return (
    <div style={{ borderTop: '1px solid #ddd', marginTop: 16, paddingTop: 16 }}>
      <h4>Input: {level}</h4>
      <label>Entity</label>
      <select value={entity} onChange={e => setEntity(e.target.value)}>
        <option value="">-- Select --</option>
        {entities.map(x => <option key={x} value={x}>{x}</option>)}
      </select>

      {entity && (
        <div style={{ marginTop: 16 }}>
          <h5>Attributes</h5>
          <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr 2fr' }}>
            {attributes.map(a => (
              <React.Fragment key={a}>
                <label>{a}</label>
                <input value={values[a] || ''} onChange={e => setVal(a, e.target.value)} />
              </React.Fragment>
            ))}
          </div>

          <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
            <button onClick={addOrModify} disabled={!entity}>Add/Modify</button>
            <button onClick={remove} disabled={!entity}>Delete</button>
            <button onClick={onClose}>Back</button>
          </div>
        </div>
      )}
    </div>
  );
}

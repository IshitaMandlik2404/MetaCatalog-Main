
import React, { useEffect, useState } from 'react';
import {
  getSubjects,
  getAttributeTypes,
  addConfig,
  deleteConfig
} from '../api';

const styles = {
  page: {
    padding: 40,
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f5f7fa, #e4ebf5)',
    fontFamily: 'Inter, Segoe UI, sans-serif'
  },
  section: {
    background: '#fff',
    borderRadius: 18,
    padding: 32,
    boxShadow: '0 12px 30px rgba(0,0,0,0.08)',
    maxWidth: 900
  },
  levelButtons: {
    display: 'flex',
    gap: 12,
    marginBottom: 24
  },
  button: {
    padding: '10px 18px',
    borderRadius: 10,
    border: 'none',
    background: '#2563eb',
    color: '#fff',
    cursor: 'pointer',
    fontSize: 14,
    transition: 'all 0.2s ease'
  },
  buttonGhost: {
    padding: '10px 18px',
    borderRadius: 10,
    border: '1px solid #d1d5db',
    background: '#fff',
    color: '#374151',
    cursor: 'pointer',
    fontSize: 14,
    transition: 'all 0.2s ease'
  },
  dangerButton: {
    background: '#dc2626'
  },
  heading: {
    marginBottom: 16,
    color: '#1f2937'
  },
  subText: {
    color: '#6b7280',
    marginBottom: 20
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '180px 1fr',
    gap: '14px 20px',
    maxWidth: 700
  },
  label: {
    fontWeight: 500,
    color: '#374151'
  },
  input: {
    padding: '10px 12px',
    borderRadius: 10,
    border: '1px solid #d1d5db',
    fontSize: 14
  },
  actions: {
    marginTop: 24,
    display: 'flex',
    gap: 12
  },
  hint: { fontSize: 12, color: '#6b7280' }
};

export default function BusinessMetadataConfig() {
  // ✅ Start with a default level so the UI shows immediately
  const [level, setLevel] = useState('catalog'); // 'catalog' | 'schema' | 'table' | 'column'

  const [subjects, setSubjects] = useState([]);        // string[]
  const [subject, setSubject] = useState('');          // selected subject

  const [types, setTypes] = useState([]);              // string[] for selected subject
  const [attributeType, setAttributeType] = useState(''); // selected attribute type

  const [loading, setLoading] = useState(true);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [error, setError] = useState('');

  // Load subjects at mount and auto-select first subject
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const data = await getSubjects(); // -> string[]
        if (!mounted) return;

        const list = Array.isArray(data) ? data : [];
        setSubjects(list);

        if (list.length > 0) {
          // pick first subject if none selected
          setSubject(prev => prev || list[0]);
        }
      } catch (e) {
        console.error('[CONFIG] getSubjects failed:', e);
        if (mounted) setError('Failed to load subjects.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // When subject changes, fetch attribute types and auto-select first
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!subject) {
        setTypes([]);
        setAttributeType('');
        return;
      }
      setLoadingTypes(true);
      setError('');
      try {
        const data = await getAttributeTypes(subject); // -> string[]
        if (!mounted) return;

        const list = Array.isArray(data) ? data : [];
        setTypes(list);
        setAttributeType(prev => (prev && list.includes(prev)) ? prev : (list[0] || ''));
      } catch (e) {
        console.error('[CONFIG] getAttributeTypes failed:', e);
        if (mounted) setError('Failed to load attribute types.');
      } finally {
        if (mounted) setLoadingTypes(false);
      }
    })();
    return () => { mounted = false; };
  }, [subject]);

  const handleAdd = async () => {
    if (!level || !subject || !attributeType) {
      alert('Please select level, subject and attribute type');
      return;
    }
    try {
      // ✅ server expects lower(entity_type) in comparisons; send lowercase
      await addConfig({ entity_type: level.toLowerCase(), subject, attribute_type: attributeType });
      alert(`Added: [${level}] ${subject} → ${attributeType}`);
    } catch (err) {
      console.error(err);
      alert('Error adding configuration');
    }
  };

  const handleDelete = async () => {
    if (!level || !subject || !attributeType) {
      alert('Please select level, subject and attribute type');
      return;
    }
    try {
      await deleteConfig({ entity_type: level.toLowerCase(), subject, attribute_type: attributeType });
      alert(`Deleted: [${level}] ${subject} → ${attributeType}`);
    } catch (err) {
      console.error(err);
      alert('Error deleting configuration');
    }
  };

  const levels = ['catalog', 'schema', 'table', 'column'];

  return (
    <div style={styles.page}>
      <h2 style={styles.heading}>Business Metadata Configuration</h2>
      <div style={styles.section}>
        {/* Level toggle */}
        <div style={styles.levelButtons}>
          {levels.map(l => {
            const isActive = level === l;
            return (
              <button
                key={l}
                style={isActive ? styles.button : styles.buttonGhost}
                onClick={() => setLevel(l)}
              >
                {l[0].toUpperCase() + l.slice(1)}
              </button>
            );
          })}
        </div>

        {loading && <p style={styles.subText}>Loading subjects…</p>}
        {error && <p style={{ ...styles.subText, color: '#b91c1c' }}>{error}</p>}

        {/* Form */}
        {!loading && (
          <>
            <div style={styles.formGrid}>
              <label style={styles.label}>Subject</label>
              <select
                style={styles.input}
                value={subject}
                onChange={e => setSubject(e.target.value)}
              >
                <option value="">-- Select --</option>
                {subjects.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>

              <label style={styles.label}>Attribute Type</label>
              <select
                style={styles.input}
                value={attributeType}
                onChange={e => setAttributeType(e.target.value)}
                disabled={!subject || loadingTypes}
              >
                <option value="">{loadingTypes ? 'Loading…' : '-- Select --'}</option>
                {types.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <p style={styles.hint}>
              Tip: “Subject” comes from your config/instance tables; “Attribute Type” is from
              <code> /api/config/attribute-types?subject=&lt;subject&gt;</code>.
            </p>

            <div style={styles.actions}>
              <button
                style={styles.button}
                onClick={handleAdd}
                disabled={!level || !subject || !attributeType}
              >
                Add
              </button>
              <button
                style={{ ...styles.button, ...styles.dangerButton }}
                onClick={handleDelete}
                disabled={!level || !subject || !attributeType}
              >
                Delete
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

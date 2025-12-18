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
    }
};

export default function BusinessMetadataConfig() {
    const [level, setLevel] = useState('');
    const [subjects, setSubjects] = useState([]);
    const [subject, setSubject] = useState('');
    const [types, setTypes] = useState([]);
    const [attributeType, setAttributeType] = useState('');

    useEffect(() => {
        getSubjects().then(setSubjects);
    }, []);

    useEffect(() => {
        subject ? getAttributeTypes(subject).then(setTypes) : setTypes([]);
    }, [subject]);

    const handleAdd = async () => {
        if (!level || !subject || !attributeType) {
            alert('Please select level, subject and attribute type');
            return;
        }
        try {
            await addConfig({ entity_type: level, subject, attribute_type: attributeType });
            alert('Configuration added successfully');
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
            await deleteConfig({ entity_type: level, subject, attribute_type: attributeType });
            alert('Configuration deleted successfully');
        } catch (err) {
            console.error(err);
            alert('Error deleting configuration');
        }
    };

    return (
        <div style={styles.page}>
            <h2 style={styles.heading}>Business Metadata Configuration</h2>
            <div style={styles.section}>
                <div style={styles.levelButtons}>
                    {['Catalog', 'Schema', 'Table', 'Column'].map(l => (
                        <button
                            key={l}
                            style={styles.button}
                            onClick={() => setLevel(l)}
                        >
                            {l}
                        </button>
                    ))}
                </div>

                {!level && (
                    <p style={styles.subText}>
                        Select a level to start configuration.
                    </p>
                )}

                {level && (
                    <>
                        <h4 style={styles.heading}>Configure: {level}</h4>

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
                                disabled={!subject}
                            >
                                <option value="">-- Select --</option>
                                {types.map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>

                        <div style={styles.actions}>
                            <button style={styles.button} onClick={handleAdd}>
                                Add
                            </button>
                            <button style={{ ...styles.button, ...styles.dangerButton }} onClick={handleDelete}>
                                Delete
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

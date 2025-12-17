import React, { useEffect, useState } from 'react';
import {
    getEntities,
    getMetadataAttributes,
    getMetadata,
    upsertMetadata,
    deleteMetadata
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
        maxWidth: 1000
    },
    heading: { marginBottom: 16, color: '#1f2937' },
    subText: { color: '#6b7280', marginBottom: 20 },
    levelButtons: { display: 'flex', gap: 12, marginBottom: 24 },
    button: {
        padding: '10px 18px',
        borderRadius: 10,
        border: 'none',
        background: '#2563eb',
        color: '#fff',
        cursor: 'pointer',
        fontSize: 14
    },
    secondaryButton: { background: '#059669' },
    dangerButton: { background: '#dc2626' },
    formGrid: {
        display: 'grid',
        gridTemplateColumns: '180px 1fr',
        gap: '14px 20px',
        maxWidth: 800
    },
    label: { fontWeight: 500, color: '#374151' },
    input: {
        padding: '10px 12px',
        borderRadius: 10,
        border: '1px solid #d1d5db',
        fontSize: 14
    },
    actions: { marginTop: 24, display: 'flex', gap: 12 }
};

export default function InputBusinessMetadata() {
    const [level, setLevel] = useState('');
    const [entities, setEntities] = useState([]);
    const [entity, setEntity] = useState('');
    const [attributes, setAttributes] = useState([]);
    const [values, setValues] = useState({});
    const [isExisting, setIsExisting] = useState(false);

    useEffect(() => {
        if (!level) return;
        setEntity('');
        setValues({});
        setIsExisting(false);

        getEntities(level).then(setEntities);
        getMetadataAttributes().then(setAttributes);
    }, [level]);


    useEffect(() => {
        if (!entity || !level) return;

        getMetadata(level, entity).then(rows => {
            if (rows && rows.length > 0) {
                const kv = {};
                rows.forEach(r => {
                    kv[r.attribute_type] = r.value || '';
                });
                setValues(kv);
                setIsExisting(true);
            } else {
                setValues({});
                setIsExisting(false);
            }
        });
    }, [entity, level]);

    const setVal = (k, v) =>
        setValues(prev => ({ ...prev, [k]: v }));


    const add = async () => {
        await upsertMetadata({ level, entity, attributes: values });
        alert('Metadata added');
        setIsExisting(true);
    };


    const modify = async () => {
        await upsertMetadata({ level, entity, attributes: values });
        alert('Metadata updated');
    };


    const remove = async () => {
        await deleteMetadata({ level, entity });
        alert('Metadata deleted');
        setValues({});
        setIsExisting(false);
    };

    return (
        <div style={styles.page}>
            <h2 style={styles.heading}>Input Business Metadata</h2>

            <div style={styles.section}>
                <div style={styles.levelButtons}>
                    {['Catalog', 'Schema', 'Table', 'Column'].map(l => (
                        <button
                            key={l}
                            style={styles.button}
                            onClick={() => setLevel(l.toLowerCase())}
                        >
                            {l}
                        </button>
                    ))}
                </div>

                {!level && (
                    <p style={styles.subText}>Select level to input metadata.</p>
                )}

                {level && (
                    <>
                        <h4 style={styles.heading}>
                            Input: {level.charAt(0).toUpperCase() + level.slice(1)}
                        </h4>

                        <div style={{ marginBottom: 24 }}>
                            <label style={styles.label}>Entity</label>
                            <select
                                style={{ ...styles.input, marginLeft: 12 }}
                                value={entity}
                                onChange={e => setEntity(e.target.value)}
                            >
                                <option value="">-- Select --</option>
                                {entities.map(e => (
                                    <option key={e} value={e}>{e}</option>
                                ))}
                            </select>
                        </div>

                        {entity && (
                            <>
                                <h5 style={styles.heading}>Attributes</h5>

                                <div style={styles.formGrid}>
                                    {attributes.map(attr => (
                                        <React.Fragment key={attr}>
                                            <label style={styles.label}>{attr}</label>
                                            <input
                                                style={styles.input}
                                                value={values[attr] || ''}
                                                onChange={e => setVal(attr, e.target.value)}
                                            />
                                        </React.Fragment>
                                    ))}
                                </div>

                                <div style={styles.actions}>
                                    <button
                                        style={styles.button}
                                        onClick={add}
                                        disabled={isExisting}
                                    >
                                        Add
                                    </button>

                                    <button
                                        style={{ ...styles.button, ...styles.secondaryButton }}
                                        onClick={modify}
                                        disabled={!isExisting}
                                    >
                                        Modify
                                    </button>

                                    <button
                                        style={{ ...styles.button, ...styles.dangerButton }}
                                        onClick={remove}
                                        disabled={!isExisting}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

import React, { useEffect, useState } from 'react';
import {
    getCatalogs,
    getMetadataAttributes,
    upsertMetadata,
    getSchemas,
    getTables,
    getColumns
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
    subText: { color: '#6b7280', marginBottom: 20, fontSize: 14 },
    levelButtons: { display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' },
    button: {
        padding: '10px 18px',
        borderRadius: 10,
        border: 'none',
        background: '#2563eb',
        color: '#fff',
        cursor: 'pointer',
        fontSize: 14
    },
    formGrid: {
        display: 'grid',
        gridTemplateColumns: '180px 1fr',
        gap: '14px 20px',
        maxWidth: 800,
        marginTop: 10
    },
    label: { fontWeight: 500, color: '#374151', fontSize: 14 },
    input: {
        padding: '10px 12px',
        borderRadius: 10,
        border: '1px solid #d1d5db',
        fontSize: 14
    },
    actions: { marginTop: 24 }
};

export default function InputBusinessMetadata() {
    const [level, setLevel] = useState('catalog');

    const [catalogs, setCatalogs] = useState([]);
    const [schemas, setSchemas] = useState([]);
    const [tables, setTables] = useState([]);
    const [columns, setColumns] = useState([]);

    const [catalog, setCatalog] = useState('');
    const [schema, setSchema] = useState('');
    const [table, setTable] = useState('');
    const [column, setColumn] = useState('');

    const [attributes, setAttributes] = useState([]);
    const [values, setValues] = useState({});

    useEffect(() => {
        setCatalog('');
        setSchema('');
        setTable('');
        setColumn('');
        setValues({});
        getCatalogs().then(setCatalogs);
        getMetadataAttributes(level).then(setAttributes);
    }, [level]);

    useEffect(() => {
        if (!catalog || !['schema', 'table', 'column'].includes(level)) return;
        setSchema('');
        setTable('');
        setColumn('');
        console.log('Fetching schemas for catalog:', catalog);
        getSchemas(catalog).then(setSchemas);
    }, [catalog, level]);

    useEffect(() => {
        if (!schema || !['table', 'column'].includes(level)) return;
        setTable('');
        setColumn('');
        getTables(catalog, schema).then(setTables);
    }, [schema, level]);

    useEffect(() => {
        if (!table || level !== 'column') return;
        setColumn('');
        getColumns(catalog, schema, table).then(setColumns);
    }, [table, level]);

    const resetAll = () => {
        setCatalog('');
        setSchema('');
        setTable('');
        setColumn('');

        setSchemas([]);
        setTables([]);
        setColumns([]);

        setValues({});
    };


    const setVal = (k, v) =>
        setValues(prev => ({ ...prev, [k]: v }));

    const add = async () => {
        const payload = {
            level,
            catalog,
            schema: level !== 'catalog' ? schema : undefined,
            table: ['table', 'column'].includes(level) ? table : undefined,
            column: level === 'column' ? column : undefined,
            attributes: values
        };

        await upsertMetadata(payload);
        alert('Metadata added successfully');
        setValues({});
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
                            onClick={() => {
                                resetAll();
                                setLevel(l.toLowerCase());
                            }}

                        >
                            {l}
                        </button>
                    ))}
                </div>

                <h4 style={styles.heading}>
                    Input: {level.toUpperCase()}
                </h4>

                {/* CATALOG */}
                <div style={{ marginBottom: 16 }}>
                    <label style={styles.label}>Catalog</label>
                    <select
                        style={{ ...styles.input, marginLeft: 12 }}
                        value={catalog}
                        onChange={e => setCatalog(e.target.value)}
                    >
                        <option value="">-- Select --</option>
                        {catalogs.map(c => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                </div>

                {/* SCHEMA */}
                {['schema', 'table', 'column'].includes(level) && catalog && (
                    <div style={{ marginBottom: 16 }}>
                        <label style={styles.label}>Schema</label>
                        <select
                            style={{ ...styles.input, marginLeft: 12 }}
                            value={schema}
                            onChange={e => setSchema(e.target.value)}
                        >
                            <option value="">-- Select --</option>
                            {schemas.map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* TABLE */}
                {['table', 'column'].includes(level) && schema && (
                    <div style={{ marginBottom: 16 }}>
                        <label style={styles.label}>Table</label>
                        <select
                            style={{ ...styles.input, marginLeft: 12 }}
                            value={table}
                            onChange={e => setTable(e.target.value)}
                        >
                            <option value="">-- Select --</option>
                            {tables.map(t => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* COLUMN */}
                {level === 'column' && table && (
                    <div style={{ marginBottom: 24 }}>
                        <label style={styles.label}>Column</label>
                        <select
                            style={{ ...styles.input, marginLeft: 12 }}
                            value={column}
                            onChange={e => setColumn(e.target.value)}
                        >
                            <option value="">-- Select --</option>
                            {columns.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* ATTRIBUTES */}
                {catalog  && (
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
                            <button style={styles.button} onClick={add}>
                                Add Metadata
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

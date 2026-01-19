import React, { useState } from 'react';
import { searchMetadata } from '../api';

const styles = {
    page: { padding: 40, minHeight: '100vh', background: 'linear-gradient(135deg, #f5f7fa, #e4ebf5)', fontFamily: 'Inter, Segoe UI, sans-serif' },
    card: { background: '#fff', borderRadius: 18, padding: 32, maxWidth: 1100, boxShadow: '0 12px 30px rgba(0,0,0,0.08)' },
    searchBar: { display: 'flex', gap: 12, marginBottom: 24 },
    input: { flex: 1, padding: '12px 14px', borderRadius: 10, border: '1px solid #d1d5db', fontSize: 14 },
    button: { padding: '12px 20px', borderRadius: 10, border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer' },
    tabs: { display: 'flex', gap: 10, marginBottom: 20 },
    tab: (active) => ({ padding: '8px 14px', borderRadius: 8, cursor: 'pointer', background: active ? '#2563eb' : '#e5e7eb', color: active ? '#fff' : '#374151', fontSize: 14 }),
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { textAlign: 'left', padding: 10, borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' },
    td: { padding: 10, borderBottom: '1px solid #f1f5f9', verticalAlign: 'top' }
};

const COLUMN_CONFIG = {
    catalog: [
        'Attribute Type',
        'Attribute Value',
        'Catalog Name',
        'Created By',
        'Created At'
    ],
    schema: [
        'Attribute Type',
        'Attribute Value',
        'Catalog Name',
        'Schema Name',
        'Created By',
        'Created At'
    ],
    table: [
        'Attribute Type',
        'Attribute Value',
        'Catalog Name',
        'Schema Name',
        'Table Name',
        'Created By',
        'Created At'
    ],
    column: [
        'Attribute Type',
        'Attribute Value',
        'Catalog Name',
        'Schema Name',
        'Table Name',
        'Column Name',
        'Created By',
        'Created At'
    ]
};

/* 🔹 Cell resolver */
function renderCell(row, col) {
    switch (col) {
        case 'Attribute Type': return row.attribute_type;
        case 'Attribute Value': return row.attribute_value;
        case 'Catalog Name': return row.catalog_name;
        case 'Schema Name': return row.schema_name;
        case 'Table Name': return row.table_name;
        case 'Column Name': return row.column_name;
        case 'Created By': return row.created_by;
        case 'Created At': return new Date(row.created_at).toLocaleString();
        default: return '';
    }
}

export default function SearchAndView() {
    const [text, setText] = useState('');
    const [activeTab, setActiveTab] = useState('catalog');
    const [results, setResults] = useState(null);

    const search = async () => {
        if (!text.trim()) return alert('Enter search text');
        const data = await searchMetadata(text);
        setResults(data);
        setActiveTab('catalog');
    };

    const rows = results?.[activeTab] || [];
    const headers = COLUMN_CONFIG[activeTab];

    return (
        <div style={styles.page}>
            <h2>Search and View Business Metadata</h2>

            <div style={styles.card}>
                <div style={styles.searchBar}>
                    <input
                        style={styles.input}
                        placeholder="Search by attribute value..."
                        value={text}
                        onChange={e => setText(e.target.value)}
                    />
                    <button style={styles.button} onClick={search}>
                        Search
                    </button>
                </div>

                {results && (
                    <>
                        <div style={styles.tabs}>
                            {['catalog', 'schema', 'table', 'column'].map(t => (
                                <div
                                    key={t}
                                    style={styles.tab(activeTab === t)}
                                    onClick={() => setActiveTab(t)}
                                >
                                    {t.toUpperCase()} ({results[t]?.length || 0})
                                </div>
                            ))}
                        </div>

                        <table style={styles.table}>
                            <thead>
                                <tr>
                                    <th style={styles.th}>S.No</th>
                                    {headers.map(h => (
                                        <th key={h} style={styles.th}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row, index) => (
                                    <tr key={index}>
                                        <td style={styles.td}>{index + 1}</td>
                                        {headers.map(h => (
                                            <td key={h} style={styles.td}>
                                                {renderCell(row, h)}
                                            </td>
                                        ))}
                                    </tr>
                                ))}

                                {rows.length === 0 && (
                                    <tr>
                                        <td colSpan={headers.length + 1} style={{ padding: 16, color: '#6b7280' }}>
                                            No results found
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </>
                )}
            </div>
        </div>
    );
}

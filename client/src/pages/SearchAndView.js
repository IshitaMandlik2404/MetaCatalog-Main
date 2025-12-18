import React, { useState } from 'react';
import { searchMetadata } from '../api';

const styles = {
    page: { padding: 40, minHeight: '100vh', background: 'linear-gradient(135deg, #f5f7fa, #e4ebf5)', fontFamily: 'Inter, Segoe UI, sans-serif' },
    card: { background: '#fff', borderRadius: 18, padding: 32, maxWidth: 1000, boxShadow: '0 12px 30px rgba(0,0,0,0.08)' },
    searchBar: { display: 'flex', gap: 12, marginBottom: 24 },
    input: { flex: 1, padding: '12px 14px', borderRadius: 10, border: '1px solid #d1d5db', fontSize: 14 },
    button: { padding: '12px 20px', borderRadius: 10, border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer' },
    tabs: { display: 'flex', gap: 10, marginBottom: 20 },
    tab: (active) => ({ padding: '8px 14px', borderRadius: 8, cursor: 'pointer', background: active ? '#2563eb' : '#e5e7eb', color: active ? '#fff' : '#374151', fontSize: 14 }),
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { textAlign: 'left', padding: 10, borderBottom: '1px solid #e5e7eb' },
    td: { padding: 10, borderBottom: '1px solid #f1f5f9' }
};

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
                                    {t.toUpperCase()} ({results[t].length})
                                </div>
                            ))}
                        </div>

                        <table style={styles.table}>
                            <thead>
                                <tr>
                                    {['S.No', 'Attribute Type', 'Attribute Value', 'Catalog Name', 'Created By', 'Created At'].map(h => (
                                        <th key={h} style={styles.th}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((r, index) => (
                                    <tr key={index}>
                                        <td style={styles.td}>{index + 1}</td> 
                                        <td style={styles.td}>{r.attribute_type}</td>
                                        <td style={styles.td}>{r.attribute_value}</td>
                                        <td style={styles.td}>{r.catalog_name}</td>
                                        <td style={styles.td}>{r.created_by}</td>
                                        <td style={styles.td}>{new Date(r.created_at).toLocaleString()}</td>
                                    </tr>
                                ))}
                                {rows.length === 0 && (
                                    <tr>
                                        <td colSpan="7" style={{ padding: 16, color: '#6b7280' }}>
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

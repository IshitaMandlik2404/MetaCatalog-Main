import React from 'react';
import { useNavigate } from 'react-router-dom';

const styles = {
    page: {
        padding: 40,
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f5f7fa, #e4ebf5)',
        fontFamily: 'Inter, Segoe UI, sans-serif'
    },
    header: {
        marginBottom: 32
    },
    title: {
        fontSize: 28,
        fontWeight: 600,
        color: '#1f2937',
        marginBottom: 8
    },
    subtitle: {
        fontSize: 16,
        color: '#6b7280'
    },
    cardContainer: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: 24,
        maxWidth: 1000
    },
    card: {
        background: '#ffffff',
        borderRadius: 18,
        padding: 28,
        boxShadow: '0 12px 30px rgba(0,0,0,0.08)',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease'
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 600,
        color: '#1f2937',
        marginBottom: 10
    },
    cardText: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 20
    },
    button: {
        padding: '10px 18px',
        borderRadius: 10,
        border: 'none',
        background: '#2563eb',
        color: '#fff',
        cursor: 'pointer',
        fontSize: 14
    }
};

export default function Home() {
    const navigate = useNavigate();

    return (
        <div style={styles.page}>
            <div style={styles.header}>
                <h1 style={styles.title}>Business Metadata Portal</h1>
                <p style={styles.subtitle}>
                    Select an option to continue
                </p>
            </div>

            <div style={styles.cardContainer}>

                <div style={styles.card}>
                    <h3 style={styles.cardTitle}>Business Metadata Configuration</h3>
                    <p style={styles.cardText}>
                        Configure catalog, schema, table, and column metadata.
                    </p>
                    <button
                        style={styles.button}
                        onClick={() => navigate('/business-metadata-config')}
                    >
                        Open
                    </button>
                </div>

                <div style={styles.card}>
                    <h3 style={styles.cardTitle}>Input Business Metadata</h3>
                    <p style={styles.cardText}>
                        Enter and manage business metadata records.
                    </p>
                    <button
                        style={styles.button}
                        onClick={() => navigate('/input-business-metadata')}
                    >
                        Open
                    </button>
                </div>


                <div style={styles.card}>
                    <h3 style={styles.cardTitle}>Search and View</h3>
                    <p style={styles.cardText}>
                        Search, filter, and view business metadata across Catalog, Schema, Table, and Column levels.
                    </p>
                    <button
                        style={styles.button}
                        onClick={() => navigate('/search-and-view')}
                    >
                        Open
                    </button>
                </div>
            </div>
        </div>
    );
}

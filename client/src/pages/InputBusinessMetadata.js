
import React, { useEffect, useMemo, useState } from 'react';
import {
  getCatalogs,
  getMetadataAttributes,
  upsertMetadata,
  getSchemas,
  getTables,
  getColumns,
  getMetadataBootstrap, // <-- ensure this exists in ../api
} from '../api';

const styles = {
  page: {
    padding: 40,
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f5f7fa, #e4ebf5)',
    fontFamily: 'Inter, Segoe UI, sans-serif',
  },
  section: {
    background: '#fff',
    borderRadius: 18,
    padding: 32,
    boxShadow: '0 12px 30px rgba(0,0,0,0.08)',
    maxWidth: 1000,
    margin: '0 auto',
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
    fontSize: 14,
  },
  buttonGhost: {
    padding: '10px 18px',
    borderRadius: 10,
    border: '1px solid #d1d5db',
    background: '#fff',
    color: '#374151',
    cursor: 'pointer',
    fontSize: 14,
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '180px 1fr',
    gap: '14px 20px',
    maxWidth: 800,
    marginTop: 10,
  },
  label: { fontWeight: 500, color: '#374151', fontSize: 14 },
  input: {
    padding: '10px 12px',
    borderRadius: 10,
    border: '1px solid #d1d5db',
    fontSize: 14,
    background: '#ffffff',
  },
  actions: { marginTop: 24, display: 'flex', gap: 12 },
  hint: { fontSize: 12, color: '#6b7280', marginTop: 6 },
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

  const [attributes, setAttributes] = useState([]);    // attribute types to render
  const [values, setValues] = useState({});            // current values (prefilled)
  const [suggestions, setSuggestions] = useState({});  // { type: [values] }
  const [loadingBootstrap, setLoadingBootstrap] = useState(false);

  // ------- Helpers -------
  const resetAllSelections = () => {
    setCatalog('');
    setSchema('');
    setTable('');
    setColumn('');

    setSchemas([]);
    setTables([]);
    setColumns([]);

    setValues({});
    setSuggestions({});
  };

  const setVal = (k, v) => setValues(prev => ({ ...prev, [k]: v }));

  const isEntityReady = useMemo(() => {
    if (level === 'catalog') return !!catalog;
    if (level === 'schema')  return !!catalog && !!schema;
    if (level === 'table')   return !!catalog && !!schema && !!table;
    if (level === 'column')  return !!catalog && !!schema && !!table && !!column;
    return false;
  }, [level, catalog, schema, table, column]);

  const add = async () => {
    if (!isEntityReady) {
      alert('Please complete the selection for the chosen level.');
      return;
    }
    const payload = {
      level,
      catalog,
      schema: level !== 'catalog' ? schema : undefined,
      table: ['table', 'column'].includes(level) ? table : undefined,
      column: level === 'column' ? column : undefined,
      attributes: values,
    };

    await upsertMetadata(payload);
    alert('Metadata added successfully');

    // Optional: reload bootstrap to reflect latest
    getMetadataBootstrap({ level, catalog, schema, table, column })
      .then(({ current, suggestions }) => {
        setValues(current || {});
        setSuggestions(suggestions || {});
      })
      .catch(console.error);
  };

  const levelTabs = ['Catalog', 'Schema', 'Table', 'Column'];

  // ------- Reset + load catalogs + attribute types when level changes -------
  useEffect(() => {
    resetAllSelections();

    // Load catalogs (for the dropdown)
    getCatalogs()
      .then(setCatalogs)
      .catch(console.error);

    // Load attribute types defined in config/instance for this level
    getMetadataAttributes(level)
      .then(setAttributes)
      .catch(console.error);
  }, [level]);

  // ------- Chain: catalog -> schemas -------
  useEffect(() => {
    if (!catalog || !['schema', 'table', 'column'].includes(level)) return;
    setSchema('');
    setTable('');
    setColumn('');
    setValues({});
    setSuggestions({});
    getSchemas(catalog)
      .then(setSchemas)
      .catch(console.error);
  }, [catalog, level]);

  // ------- Chain: schema -> tables -------
  useEffect(() => {
    if (!schema || !['table', 'column'].includes(level)) return;
    setTable('');
    setColumn('');
    setValues({});
    setSuggestions({});
    getTables(catalog, schema)
      .then(setTables)
      .catch(console.error);
  }, [schema, level]);

  // ------- Chain: table -> columns -------
  useEffect(() => {
    if (!table || level !== 'column') return;
    setColumn('');
    setValues({});
    setSuggestions({});
    getColumns(catalog, schema, table)
      .then(setColumns)
      .catch(console.error);
  }, [table, level]);

  // ------- Bootstrap: prefill current values + suggestions when entity selection is complete -------
  useEffect(() => {
    const ready =
      (level === 'catalog' && catalog) ||
      (level === 'schema'  && catalog && schema) ||
      (level === 'table'   && catalog && schema && table) ||
      (level === 'column'  && catalog && schema && table && column);

    if (!ready) {
      setValues({});
      setSuggestions({});
      return;
    }

    setLoadingBootstrap(true);
    getMetadataBootstrap({ level, catalog, schema, table, column })
      .then(({ current, suggestions, attributeTypes }) => {
        // Prefill textboxes with current values
        setValues(current || {});
        // Provide datalist suggestions
        setSuggestions(suggestions || {});
        // If bootstrap returns attributeTypes, prefer them (ensures union of what’s saved)
        if (Array.isArray(attributeTypes) && attributeTypes.length > 0) {
          setAttributes(attributeTypes);
        }
      })
      .catch(console.error)
      .finally(() => setLoadingBootstrap(false));
  }, [level, catalog, schema, table, column]);

return (
  <div style={styles.page}>
    <h2 style={styles.heading}>Input Business Metadata</h2>

    <div style={styles.section}>
      {/* Level selector */}
      <div style={styles.levelButtons}>
        {levelTabs.map(l => (
          <button
            key={l}
            style={l.toLowerCase() === level ? styles.button : styles.buttonGhost}
            onClick={() => {
              setLevel(l.toLowerCase());
            }}
            aria-pressed={l.toLowerCase() === level}
          >
            {l}
          </button>
        ))}
      </div>

      <h4 style={styles.heading}>Input: {level.toUpperCase()}</h4>

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
        <div style={styles.hint}>Select the business catalog name (from your metadata).</div>
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
          <div style={styles.hint}>Unity Catalog schema within the selected catalog.</div>
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
          <div style={styles.hint}>Table within the selected catalog & schema.</div>
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
          <div style={styles.hint}>Column within the selected table.</div>
        </div>
      )}

      {/* ATTRIBUTES */}
      {catalog && (
        <>
          <h5 style={styles.heading}>Attributes</h5>

          {loadingBootstrap && (
            <div style={{ marginBottom: 12, color: '#6b7280' }}>
              Loading current values & suggestions…
            </div>
          )}

          <div style={styles.formGrid}>
            {attributes.map(attr => {
              const listId = `dl_${attr.replace(/\s+/g, '_').toLowerCase()}`;
              const opts = (suggestions[attr] || []).slice(0, 100); // cap for safety
              return (
                <React.Fragment key={attr}>
                  <label style={styles.label}>{attr}</label>
                  <>
                    <input
                      style={styles.input}
                      value={values[attr] || ''}
                      onChange={e => setVal(attr, e.target.value)}
                      list={listId}
                      placeholder="Type or pick a value"
                    />
                    <datalist id={listId}>
                      {opts.map(v => (
                        <option key={`${attr}:${v}`} value={v} />
                      ))}
                    </datalist>
                  </>
                </React.Fragment>
              );
            })}
          </div>

          <div style={styles.actions}>
            <button
              style={styles.button}
              onClick={add}
              disabled={!isEntityReady}
              title={!isEntityReady ? 'Complete selection first' : 'Save'}
            >
              Add Metadata
            </button>

            <button
              style={styles.buttonGhost}
              onClick={() => {
                setValues({});
              }}
            >
              Clear Values
            </button>

            <button
              style={styles.buttonGhost}
              onClick={() => {
                // Reload bootstrap (current + suggestions) for the selected entity
                if (!isEntityReady) return;
                setLoadingBootstrap(true);
                getMetadataBootstrap({ level, catalog, schema, table, column })
                  .then(({ current, suggestions, attributeTypes }) => {
                    setValues(current || {});
                    setSuggestions(suggestions || {});
                    if (Array.isArray(attributeTypes) && attributeTypes.length > 0) {
                      setAttributes(attributeTypes);
                    }
                  })
                  .catch(console.error)
                  .finally(() => setLoadingBootstrap(false));
              }}
            >
              Reload Current
            </button>
          </div>
        </>
      )}
    </div>
  </div>
);
}

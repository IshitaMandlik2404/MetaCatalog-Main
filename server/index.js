
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { executeSQL } = require('./dbsql');

const app = express();
app.use(cors());
app.use(express.json());

// Health
app.get('/api/health', (req, res) => res.json({ ok: true }));

// CONFIG
app.get('/api/config/subjects', async (req, res) => {
  try {
    const { rows } = await executeSQL({ statement: `SELECT DISTINCT subject FROM metacatalog.metaschema.business_metadata_config ORDER BY subject` });
    console.log('[DATA] subjects rows:', rows);
    
// Defensive mapping for different casings + decode & deduplicate + sort
    const names = rows
      .map(r => r.Subject ?? r.subject ?? r.SUBJECT ?? '')      // <- key casing fix
      .filter(Boolean)
      .map(s => s.replace(/&amp;/g, '&'))                       // <- optional: decode HTML entity
      .filter((v, i, a) => a.indexOf(v) === i)                  // <- remove duplicates
      .sort((a, b) => a.localeCompare(b));

    res.json(names);
  } catch (e) { 
    console.error('[ERR] /api/config/subjects', e.message);
    res.status(500).json({ error: e.message }); }
});


app.get('/api/config/attribute-types', async (req, res) => {
  try {
    const { subject } = req.query;
    // Log the request for visibility
    console.log('[REQ] /api/config/attribute-types', { subject });

    const { rows } = await executeSQL({
      statement: `SELECT attribute_type
                  FROM metacatalog.metaschema.business_metadata_config
                  WHERE subject = :subject
                  ORDER BY attribute_type`,
      parameters: [{ name: 'subject', value: subject }]
    });

    console.log('[DATA] attribute_types rows:', rows);

    // Defensive mapping for different casings, decode &amp;, dedupe, sort
    const types = rows
      .map(r => r.attribute_type ?? r.Attribute_type ?? r.ATTRIBUTE_TYPE ?? '')
      .filter(Boolean)
      .map(s => s.replace(/&amp;/g, '&'))
      .filter((v, i, a) => a.indexOf(v) === i)
      .sort((a, b) => a.localeCompare(b));

    res.json(types);
  } catch (e) {
    console.error('[ERR] /api/config/attribute-types', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/config', async (req, res) => {
  try {
    const { sno, entity_type, subject, attribute_type } = req.body;
    await executeSQL({
      statement: `INSERT INTO business_metadata_config (sno, entity_type, subject, attribute_type) VALUES (:sno, :entity_type, :subject, :attribute_type)`,
      parameters: [
        { name: 'sno', value: String(sno), type: 'INT' },
        { name: 'entity_type', value: entity_type },
        { name: 'subject', value: subject },
        { name: 'attribute_type', value: attribute_type }
      ]
    });
    res.json({ status: 'OK' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/config', async (req, res) => {
  try {
    const { sno, entity_type, subject, attribute_type } = req.body;
    await executeSQL({
      statement: `UPDATE business_metadata_config SET entity_type = :entity_type, subject = :subject, attribute_type = :attribute_type WHERE sno = :sno`,
      parameters: [
        { name: 'sno', value: String(sno), type: 'INT' },
        { name: 'entity_type', value: entity_type },
        { name: 'subject', value: subject },
        { name: 'attribute_type', value: attribute_type }
      ]
    });
    res.json({ status: 'OK' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/config', async (req, res) => {
  try {
    const { sno } = req.body;
    await executeSQL({
      statement: `DELETE FROM business_metadata_config WHERE sno = :sno`,
      parameters: [{ name: 'sno', value: String(sno), type: 'INT' }]
    });
    res.json({ status: 'OK' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// INPUT
app.get('/api/entities', async (req, res) => {
  try {
    const { level } = req.query;
    let col;
    switch ((level || '').toLowerCase()) {
      case 'catalog': col = 'catalog_name'; break;
      case 'schema':  col = 'schema_name';  break;
      case 'table':   col = 'table_name';   break;
      case 'column':  col = 'column_name';  break;
      default: return res.status(400).json({ error: 'Invalid level' });
    }
    const { rows } = await executeSQL({ statement: `SELECT DISTINCT ${col} FROM business_metadata_config_instance ORDER BY ${col}` });
    res.json(rows.map(r => r[col]));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/metadata/attributes', async (req, res) => {
  try {
    const { rows } = await executeSQL({ statement: `SELECT DISTINCT Attribute_type FROM business_metadata_config ORDER BY Attribute_type` });
    res.json(rows.map(r => r.Attribute_type));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/metadata', async (req, res) => {
  try {
    const { level, entity } = req.query;
    const col = (level.toLowerCase() === 'table')  ? 'table_name'  :
                (level.toLowerCase() === 'schema') ? 'schema_name' :
                (level.toLowerCase() === 'catalog')? 'catalog_name':
                (level.toLowerCase() === 'column') ? 'column_name' : null;
    if (!col) return res.status(400).json({ error: 'Invalid level' });
    const { rows } = await executeSQL({
      statement: `SELECT * FROM business_metadata_config_instance WHERE ${col} = :entity`,
      parameters: [{ name: 'entity', value: entity }]
    });
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/metadata', async (req, res) => {
  try {
    const { level, entity, attributes } = req.body;
    for (const [attr, val] of Object.entries(attributes || {})) {
      await executeSQL({
        statement: `MERGE INTO business_metadata_config_instance t
                    USING (SELECT :entity AS entity, :level AS level, :attr AS attr, :val AS val) s
                    ON t.level = s.level AND t.attr = s.attr AND t.entity = s.entity
                    WHEN MATCHED THEN UPDATE SET t.val = s.val
                    WHEN NOT MATCHED THEN INSERT (entity, level, attr, val) VALUES (s.entity, s.level, s.attr, s.val)`,
        parameters: [
          { name: 'entity', value: entity },
          { name: 'level',  value: level },
          { name: 'attr',   value: attr },
          { name: 'val',    value: val }
        ]
      });
    }
    res.json({ status: 'OK' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/metadata', async (req, res) => {
  try {
    const { level, entity } = req.body;
    await executeSQL({
      statement: `DELETE FROM business_metadata_config_instance WHERE level = :level AND entity = :entity`,
      parameters: [
        { name: 'level', value: level },
        { name: 'entity', value: entity }
      ]
    });
    res.json({ status: 'OK' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`Server listening on http://localhost:${port}`));

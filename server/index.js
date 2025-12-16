require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { executeSQL } = require('./dbsql'); // Your DB wrapper
 
const app = express();
 
/* -------------------- Middleware -------------------- */
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-User', 'x-user'],
}));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
 
// Simple logger
app.use((req, res, next) => {
  console.log(`[REQ] ${req.method} ${req.originalUrl}`);
  if (req.method !== 'GET') console.log('Body:', req.body);
  next();
});
 
/* -------------------- Constants -------------------- */
const TBL_CONFIG   = 'metacatalog.metaschema.business_metadata_config';
const TBL_INSTANCE = 'metacatalog.metaschema.business_metadata_config_instance';
 
/* -------------------- Helpers -------------------- */
// Decode ANY &amp; variants to plain '&'
function decodeAmpSafe(s) {
  return String(s || '').replace(/&amp;(?:amp;)+/g, '&').replace(/&amp;/g, '&');
}
 
function normalizeResult(result) {
  return (
    (Array.isArray(result) && result) ||
    (result && Array.isArray(result.rows) && result.rows) ||
    (result && Array.isArray(result.data) && result.data) ||
    (result && typeof result.toArray === 'function' && result.toArray()) ||
    []
  );
}
 
function norm(s) { return decodeAmpSafe(s).trim().toLowerCase(); }
 
// Wrap positional values as objects for Databricks SQL Statements API
function paramVals(...vals) {
  return vals.map(v => ({ value: v }));
}
 
/* -------------------- Health -------------------- */
app.get('/api/health', (req, res) => res.json({ ok: true }));
 
app.get('/api/health/db', async (req, res) => {
  try {
    const r = await executeSQL({ statement: 'SELECT 1 AS ok' });
    res.json({ ok: true, result: r });
  } catch (e) {
    console.error('[ERR] /api/health/db', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});
 
/* -------------------- CONFIG (read-only for UI) -------------------- */
app.get('/api/config/subjects', async (req, res) => {
  try {
    const result = await executeSQL({
      statement: `SELECT DISTINCT subject FROM ${TBL_CONFIG} ORDER BY subject`
    });
    const rows = normalizeResult(result);
    const names = rows
      .map(r => r.subject ?? r.Subject ?? r.SUBJECT ?? '')
      .filter(Boolean)
      .map(decodeAmpSafe)
      .map(s => s.trim())
      .filter((v, i, a) => a.indexOf(v) === i)
      .sort((a, b) => a.localeCompare(b));
 
    console.log('[DATA] /api/config/subjects count:', names.length);
    res.json(names);
  } catch (e) {
    console.error('[ERR] /api/config/subjects', e);
    res.status(500).json({ error: e.message });
  }
});
 
/**
 * Attribute types for selected subject
 * - NO SQL-bound params; filter in Node to avoid binding errors.
 * - Fallback to INSTANCE if CONFIG has none.
 */
app.get('/api/config/attribute-types', async (req, res) => {
  const rawSubject = req.query.subject || '';
  const subject = decodeAmpSafe(rawSubject).trim();
  console.log('[REQ] /api/config/attribute-types', { rawSubject, subject });
  if (!subject) return res.status(400).json({ error: 'Missing subject' });
 
  try {
    const cfg = await executeSQL({
      statement: `
        SELECT subject, attribute_type
        FROM ${TBL_CONFIG}
        WHERE attribute_type IS NOT NULL AND trim(attribute_type) <> ''
        ORDER BY subject, attribute_type
      `,
    });
    const cfgRows = normalizeResult(cfg);
    const typesCfg = cfgRows
      .filter(r => norm(r.subject ?? r.Subject ?? r.SUBJECT ?? '') === norm(subject))
      .map(r => r.attribute_type ?? r.Attribute_type ?? r.ATTRIBUTE_TYPE ?? '')
      .map(decodeAmpSafe).map(s => s.trim())
      .filter(Boolean).filter((v, i, a) => a.indexOf(v) === i)
      .sort((a, b) => a.localeCompare(b));
 
    console.log('[DATA] attribute-types (CONFIG) count:', typesCfg.length);
    if (typesCfg.length > 0) return res.json(typesCfg);
 
    const inst = await executeSQL({
      statement: `
        SELECT subject, attribute_type
        FROM ${TBL_INSTANCE}
        WHERE attribute_type IS NOT NULL AND trim(attribute_type) <> ''
        ORDER BY subject, attribute_type
      `,
    });
    const instRows = normalizeResult(inst);
    const typesInst = instRows
      .filter(r => norm(r.subject ?? r.Subject ?? r.SUBJECT ?? '') === norm(subject))
      .map(r => r.attribute_type ?? r.Attribute_type ?? r.ATTRIBUTE_TYPE ?? '')
      .map(decodeAmpSafe).map(s => s.trim())
      .filter(Boolean).filter((v, i, a) => a.indexOf(v) === i)
      .sort((a, b) => a.localeCompare(b));
 
    console.log('[DATA] attribute-types (INSTANCE fallback) count:', typesInst.length);
    res.json(typesInst);
  } catch (e) {
    console.error('[ERR] /api/config/attribute-types', e);
    res.status(500).json({ error: e.message || 'Failed to fetch attribute types' });
  }
});
 
/* -------------------- ADD / MODIFY / DELETE — INSTANCE ONLY -------------------- */
/**
 * Add (upsert) into INSTANCE only using DELETE + INSERT.
 * NOTE: We send parameter objects { value: ... } to satisfy Databricks API.
 */
app.post('/api/config', async (req, res) => {
  const raw = req.body || {};
  try {
    const entity_type    = String(raw.entity_type || '').toLowerCase().trim(); // catalog|schema|table|column
    const subject        = decodeAmpSafe(raw.subject || '').trim();
    const attribute_type = decodeAmpSafe(raw.attribute_type || '').trim();
    const created_by     = (raw.created_by || req.headers['x-user'] || 'ui').toString().trim();
 
    console.log('[REQ] POST /api/config body:', { entity_type, subject, attribute_type, created_by });
 
    if (!entity_type || !subject || !attribute_type) {
      return res.status(400).json({ error: 'Missing entity_type, subject, or attribute_type' });
    }
 
    // 1) Delete existing row for triplet (normalize '&amp;' -> '&' in SQL)
    await executeSQL({
      statement: `
        DELETE FROM ${TBL_INSTANCE}
        WHERE lower(trim(entity_type))    = lower(trim(?))
          AND lower(replace(trim(subject),'&amp;','&')) = lower(replace(trim(?),'&amp;','&'))
          AND lower(trim(attribute_type)) = lower(trim(?))
      `,
      parameters: paramVals(entity_type, subject, attribute_type),
    });
 
    // 2) Insert new row
    await executeSQL({
      statement: `
        INSERT INTO ${TBL_INSTANCE} (entity_type, subject, attribute_type, created_by, created_at)
        VALUES (?, ?, ?, ?, current_timestamp())
      `,
      parameters: paramVals(entity_type, subject, attribute_type, created_by),
    });
 
    res.json({ status: 'OK', instance_only: true });
  } catch (e) {
    console.error('[ERR] POST /api/config (INSTANCE only)', e);
    res.status(500).json({ error: e.message || 'Failed to upsert instance row' });
  }
});
 
/* Modify instance row */
app.put('/api/config', async (req, res) => {
  try {
    const sno            = req.body.sno ? String(req.body.sno) : null;
    const entity_type    = String(req.body.entity_type || '').toLowerCase().trim();
    const subject        = decodeAmpSafe(req.body.subject || '').trim();
    const attribute_type = decodeAmpSafe(req.body.attribute_type || '').trim();
 
    if (!entity_type || !subject || !attribute_type) {
      return res.status(400).json({ error: 'Missing entity_type, subject, or attribute_type' });
    }
 
    if (sno) {
      await executeSQL({
        statement: `
          UPDATE ${TBL_INSTANCE}
          SET entity_type = ?, subject = ?, attribute_type = ?, created_at = current_timestamp()
          WHERE sno = ?
        `,
        parameters: paramVals(entity_type, subject, attribute_type, sno),
      });
    } else {
      await executeSQL({
        statement: `
          DELETE FROM ${TBL_INSTANCE}
          WHERE lower(trim(entity_type))    = lower(trim(?))
            AND lower(replace(trim(subject),'&amp;','&')) = lower(replace(trim(?),'&amp;','&'))
            AND lower(trim(attribute_type)) = lower(trim(?))
        `,
        parameters: paramVals(entity_type, subject, attribute_type),
      });
 
      await executeSQL({
        statement: `
          INSERT INTO ${TBL_INSTANCE} (entity_type, subject, attribute_type, created_at)
          VALUES (?, ?, ?, current_timestamp())
        `,
        parameters: paramVals(entity_type, subject, attribute_type),
      });
    }
 
    res.json({ status: 'OK' });
  } catch (e) {
    console.error('[ERR] PUT /api/config (INSTANCE only)', e);
    res.status(500).json({ error: e.message });
  }
});
 
/* Delete instance row by sno */
app.delete('/api/config', async (req, res) => {
  try {
    const { sno } = req.body;
    if (!sno) return res.status(400).json({ error: 'Missing sno' });
 
    await executeSQL({
      statement: `DELETE FROM ${TBL_INSTANCE} WHERE sno = ?`,
      parameters: paramVals(String(sno)),
    });
 
    res.json({ status: 'OK' });
  } catch (e) {
    console.error('[ERR] DELETE /api/config (INSTANCE only)', e);
    res.status(500).json({ error: e.message });
  }
});
 
/* -------------------- INSTANCE reads -------------------- */
app.get('/api/entities', async (req, res) => {
  try {
    const lvl = String(req.query.level || '').toLowerCase();
    if (!['catalog','schema','table','column'].includes(lvl)) {
      return res.status(400).json({ error: 'Invalid level' });
    }
 
    const result = await executeSQL({
      statement: `
        SELECT DISTINCT subject
        FROM ${TBL_INSTANCE}
        WHERE entity_type = ?
        ORDER BY subject
      `,
      parameters: paramVals(lvl),
    });
 
    const rows = normalizeResult(result);
    console.log('[DATA] /api/entities (subjects)', { lvl, count: rows.length });
    res.json(rows.map(r => r.subject ?? r.Subject ?? r.SUBJECT).filter(Boolean));
  } catch (e) {
    console.error('[ERR] /api/entities', e);
    res.status(500).json({ error: e.message });
  }
});
 
app.get('/api/metadata/attributes', async (req, res) => {
  try {
    const result = await executeSQL({
      statement: `
        SELECT DISTINCT attribute_type
        FROM ${TBL_INSTANCE}
        ORDER BY attribute_type
      `,
    });
    const rows = normalizeResult(result);
    res.json(
      rows.map(r => r.attribute_type ?? r.Attribute_type ?? r.ATTRIBUTE_TYPE ?? '')
          .filter(Boolean)
          .map(decodeAmpSafe)
    );
  } catch (e) {
    console.error('[ERR] /api/metadata/attributes', e);
    res.status(500).json({ error: e.message });
  }
});
 
app.get('/api/metadata', async (req, res) => {
  try {
    const lvl     = String(req.query.level || '').toLowerCase();
    const subject = decodeAmpSafe(req.query.subject || req.query.entity || '').trim();
 
    if (!['catalog','schema','table','column'].includes(lvl)) {
      return res.status(400).json({ error: 'Invalid level' });
    }
    if (!subject) {
      return res.status(400).json({ error: 'Missing subject' });
    }
 
    const result = await executeSQL({
      statement: `
        SELECT attribute_type, created_by, created_at
        FROM ${TBL_INSTANCE}
        WHERE entity_type = ? AND subject = ?
        ORDER BY attribute_type
      `,
      parameters: paramVals(lvl, subject),
    });
 
    const rows = normalizeResult(result);
    res.json(rows);
  } catch (e) {
    console.error('[ERR] /api/metadata', e);
    res.status(500).json({ error: e.message });
  }
});
 
/* -------------------- Listen -------------------- */
const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
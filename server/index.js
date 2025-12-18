require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { executeSQL } = require('./dbsql');

const app = express();

app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-User', 'x-user'],
}));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`[REQ] ${req.method} ${req.originalUrl}`);
  if (req.method !== 'GET') console.log('Body:', req.body);
  next();
});

const TBL_CONFIG = 'metacatalog.metaschema.business_metadata_config';
const TBL_INSTANCE = 'metacatalog.metaschema.business_metadata_config_instance';
const METADATA_TABLES = {
  catalog: 'metacatalog.metaschema.business_catalog_metadata_healthcare',
  schema:  'metacatalog.metaschema.business_schema_metadata_healthcare',
  table:   'metacatalog.metaschema.business_table_metadata_healthcare',
  column:  'metacatalog.metaschema.business_column_metadata_healthcare',
};

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

function paramVals(...vals) {
  return vals.map(v => ({ value: v }));
}

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


app.post('/api/config', async (req, res) => {
  const raw = req.body || {};
  try {
    const entity_type = String(raw.entity_type || '').toLowerCase().trim();
    const subject = decodeAmpSafe(raw.subject || '').trim();
    const attribute_type = decodeAmpSafe(raw.attribute_type || '').trim();
    const created_by = (raw.created_by || req.headers['x-user'] || 'ui').toString().trim();

    console.log('[REQ] POST /api/config body:', { entity_type, subject, attribute_type, created_by });

    if (!entity_type || !subject || !attribute_type) {
      return res.status(400).json({ error: 'Missing entity_type, subject, or attribute_type' });
    }

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
        INSERT INTO ${TBL_INSTANCE} (entity_type, subject, attribute_type, created_by, created_at)
        VALUES (?, ?, ?, ?, current_timestamp())
      `,
      parameters: paramVals(entity_type, subject, attribute_type, created_by),
    });

    res.json({ status: 'OK', instance_only: true });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Failed to upsert instance row' });
  }
});

app.post('/api/metadata/search', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Search text is required' });
    }

    const searchText = `%${text.trim()}%`;

    const tables = [
      { name: 'catalog', table: 'business_catalog_metadata_healthcare' },
      { name: 'schema', table: 'business_schema_metadata_healthcare' },
      { name: 'table', table: 'business_table_metadata_healthcare' },
      { name: 'column', table: 'business_column_metadata_healthcare' }
    ];

    const queries = tables.map(({ name, table }) =>
      executeSQL({
        statement: `SELECT * FROM ${table} WHERE attribute_value ILIKE ? LIMIT 100`,
        parameters: paramVals(searchText)
      })
        .then(normalizeResult)
        .then(results => ({ [name]: results }))
    );

    const results = await Promise.all(queries);
    const merged = Object.assign({}, ...results);

    res.json(merged);

  } catch (e) {
    console.error('[ERR] POST /api/metadata/search', e);
    res.status(500).json({ error: e.message || 'Search failed' });
  }
});

app.delete('/api/config', async (req, res) => {
  try {
    const { attribute_type, entity_type, subject } = req.body;
    if (!subject && !attribute_type && entity_type) return res.status(400).json({ error: 'Missing sno' });

    await executeSQL({
      statement: `DELETE FROM ${TBL_INSTANCE} WHERE attribute_type = ? and entity_type=? and subject=?`,
      parameters: paramVals(attribute_type,
        entity_type.toLowerCase(),
        subject),
    });
    res.json({ status: 'OK' });
  } catch (e) {
    console.error('[ERR] DELETE /api/config (INSTANCE only)', e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/entities', async (req, res) => {
  try {
    const lvl = String(req.query.level || '').toLowerCase();
    if (!['catalog', 'schema', 'table', 'column'].includes(lvl)) {
      return res.status(400).json({ error: 'Invalid level' });
    }

    const result = await executeSQL({
      statement: `
        SELECT DISTINCT attribute_type
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
  const level = String(req.query.level || '').toLowerCase();
  console.log('[REQ] /api/metadata/attributes', { level });

  if (!['catalog', 'schema', 'table', 'column'].includes(level)) {
    return res.status(400).json({ error: 'Invalid level' });
  }

  try {
    const result = await executeSQL({
      statement: `
        SELECT DISTINCT attribute_type
        FROM ${TBL_INSTANCE}
        WHERE lower(entity_type) = ?
        ORDER BY attribute_type
      `,
      parameters: paramVals(level),
    });
    console.log('rowsssss', result);

    const rows = normalizeResult(result);

    res.json(
      rows
        .map(r => r.attribute_type ?? r.ATTRIBUTE_TYPE)
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
    const level = String(req.query.level || '').toLowerCase();
    const catalog = req.query.catalog;
    const schema = req.query.schema;
    const table = req.query.table;
    console.log('/api/metadata', { level, catalog, schema, table });

    if (!['catalog', 'schema', 'table', 'column'].includes(level)) {
      return res.status(400).json({ error: 'Invalid level' });
    }

    let sql = '';
    let params = [];

    if (level === 'catalog') {
      console.log('Fetching catalogs for level:', level);
      sql = `
        SELECT catalog_name AS name
        FROM system.information_schema.catalogs
        WHERE catalog_name NOT IN ('system', 'hive_metastore', 'samples')
        ORDER BY catalog_name
      `;
    }

    if (level === 'schema') {
      if (!catalog) {
        return res.status(400).json({ error: 'Missing catalog' });
      }

      sql = `
        SELECT schema_name AS name
        FROM system.information_schema.schemata
        WHERE catalog_name = ?
          AND schema_name NOT IN ('information_schema')
        ORDER BY schema_name
      `;
      params.push(catalog);
    }

    if (level === 'table') {
      if (!catalog || !schema) {
        return res.status(400).json({ error: 'Missing catalog or schema' });
      }

      sql = `
        SELECT table_name AS name
        FROM system.information_schema.tables
        WHERE table_catalog = ?
          AND table_schema = ?
        ORDER BY table_name
      `;
      params.push(catalog, schema);
    }
    if (level === 'column') {
      if (!catalog || !schema || !table) {
        return res.status(400).json({ error: 'Missing catalog, schema, or table' });
      }

      sql = `
        SELECT column_name AS name
        FROM system.information_schema.columns
        WHERE table_catalog = ?
          AND table_schema = ?
          AND table_name = ?
        ORDER BY ordinal_position
      `;
      params.push(catalog, schema, table);
    }

    const result = await executeSQL({
      statement: sql,
      parameters: params
    });
    const rows = normalizeResult(result);
    console.log('result:', result);

    res.json(rows.map(r => r.name));
  } catch (e) {
    console.error('[ERR] /api/metadata', e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/catalogs', async (req, res) => {
  try {
    const sql = `
        SELECT catalog_name AS name
        FROM system.information_schema.catalogs
        WHERE catalog_name NOT IN ('system', 'hive_metastore', 'samples')
      `;
    const result = await executeSQL({ statement: sql });
    const data = (result?.rows || []).map(r => r.name);
    console.log('Fetched catalogs:', data);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// app.post('/api/catalog/metadata', async (req, res) => {
//   try {
//     const { level, catalog, attributes } = req.body;

//     console.log('Received metadata upsert request:', req.body);

//     if (
//       !level ||
//       !catalog ||
//       !attributes ||
//       typeof attributes !== 'object'
//     ) {
//       return res.status(400).json({ error: 'Invalid request payload' });
//     }
//     const created_by = req.headers['x-user'] || 'ui';

//     await executeSQL({
//       statement: `
//         DELETE FROM metacatalog.metaschema.business_catalog_metadata_healthcare
//         WHERE catalog_name = ?
//       `,
//       parameters: paramVals(catalog),
//     });

//     for (const [attribute_type, attribute_value] of Object.entries(attributes)) {
//       await executeSQL({
//         statement: `
//           INSERT INTO metacatalog.metaschema.business_catalog_metadata_healthcare
//           (
//             attribute_type,
//             attribute_value,
//             created_at,
//             created_by,
//             catalog_name
//           )
//           VALUES ( ?, ?, current_timestamp(), ?, ?)
//         `,
//         parameters: paramVals(
//           attribute_type,
//           attribute_value,
//           created_by,
//           catalog
//         ),
//       });
//     }
//     console.log('Metadata upsert completed for catalog:', catalog);
//     res.json({ status: 'OK', inserted: Object.keys(attributes).length });
//   } catch (e) {
//     console.error('[ERR] POST /api/catalog/metadata', e);
//     res.status(500).json({ error: e.message });
//   }
// });

app.post('/api/catalog/metadata', async (req, res) => {
  try {
    const {
      level,
      catalog,
      schema,
      table,
      column,
      attributes
    } = req.body;

    console.log('Received metadata upsert request:', req.body);

    if (
      !level ||
      !attributes ||
      typeof attributes !== 'object'
    ) {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    if (!METADATA_TABLES[level]) {
      return res.status(400).json({ error: 'Invalid level' });
    }

    const tableName = METADATA_TABLES[level];
    const created_by = req.headers['x-user'] || 'ui';
    if (level === 'catalog') {
      await executeSQL({
        statement: `
          DELETE FROM ${tableName}
          WHERE catalog_name = ?
        `,
        parameters: paramVals(catalog),
      });
    }

    if (level === 'schema') {
      await executeSQL({
        statement: `
          DELETE FROM ${tableName}
          WHERE catalog_name = ?
            AND schema_name = ?
        `,
        parameters: paramVals(catalog, schema),
      });
    }

    if (level === 'table') {
      await executeSQL({
        statement: `
          DELETE FROM ${tableName}
          WHERE catalog_name = ?
            AND schema_name = ?
            AND table_name = ?
        `,
        parameters: paramVals(catalog, schema, table),
      });
    }

    if (level === 'column') {
      await executeSQL({
        statement: `
          DELETE FROM ${tableName}
          WHERE catalog_name = ?
            AND schema_name = ?
            AND table_name = ?
            AND column_name = ?
        `,
        parameters: paramVals(catalog, schema, table, column),
      });
    }

    for (const [attribute_type, attribute_value] of Object.entries(attributes)) {

      if (level === 'catalog') {
        await executeSQL({
          statement: `
            INSERT INTO ${tableName}
            (
              catalog_name,
              attribute_type,
              attribute_value,
              created_at,
              created_by
            )
            VALUES (?, ?, ?, current_timestamp(), ?)
          `,
          parameters: paramVals(
            catalog,
            attribute_type,
            attribute_value,
            created_by
          ),
        });
      }

      if (level === 'schema') {
        await executeSQL({
          statement: `
            INSERT INTO ${tableName}
            (
              catalog_name,
              schema_name,
              attribute_type,
              attribute_value,
              created_at,
              created_by
            )
            VALUES (?, ?, ?, ?, current_timestamp(), ?)
          `,
          parameters: paramVals(
            catalog,
            schema,
            attribute_type,
            attribute_value,
            created_by
          ),
        });
      }

      if (level === 'table') {
        await executeSQL({
          statement: `
            INSERT INTO ${tableName}
            (
              catalog_name,
              schema_name,
              table_name,
              attribute_type,
              attribute_value,
              created_at,
              created_by
            )
            VALUES (?, ?, ?, ?, ?, current_timestamp(), ?)
          `,
          parameters: paramVals(
            catalog,
            schema,
            table,
            attribute_type,
            attribute_value,
            created_by
          ),
        });
      }

      if (level === 'column') {
        await executeSQL({
          statement: `
            INSERT INTO ${tableName}
            (
              catalog_name,
              schema_name,
              table_name,
              column_name,
              attribute_type,
              attribute_value,
              created_at,
              created_by
            )
            VALUES (?, ?, ?, ?, ?, ?, current_timestamp(), ?)
          `,
          parameters: paramVals(
            catalog,
            schema,
            table,
            column,
            attribute_type,
            attribute_value,
            created_by
          ),
        });
      }
    }
    console.log(`Metadata upsert completed for level: ${level}`);
    res.json({
      status: 'OK',
      level,
      inserted: Object.keys(attributes).length
    });

  } catch (e) {
    console.error('[ERR] POST /api/catalog/metadata', e);
    res.status(500).json({ error: e.message });
  }
});


app.delete('/api/catalog/metadata', async (req, res) => {
  try {
    const { level, catalog } = req.body;

    if (!level || level !== 'catalog' || !catalog) {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    await executeSQL({
      statement: `
        DELETE FROM metacatalog.metaschema.business_catalog_metadata_healthcare
        WHERE entity_type = ?
          AND catalog_name = ?
      `,
      parameters: paramVals('catalog', catalog),
    });

    res.json({ status: 'DELETED' });
  } catch (e) {
    console.error('[ERR] DELETE /api/catalog/metadata', e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/schemas', async (req, res) => {
  try {
    const catalog = String(req.query.catalog || '').trim();
    console.log('[REQ] /api/schemas', { catalog });
    if (!catalog) {
      return res.status(400).json({ error: 'Missing catalog' });
    }

    const result = await executeSQL({
      statement: `
    SELECT schema_name AS name
    FROM system.information_schema.schemata
    WHERE lower(catalog_name) = ?
      AND schema_name NOT IN ('information_schema')
    ORDER BY schema_name
  `,
      parameters: paramVals(catalog),
    });


    const rows = normalizeResult(result);
    console.log('Fetched schemas:', rows.map(r => r.name));
    res.json(rows.map(r => r.name));
  } catch (e) {
    console.error('[ERR] /api/schemas', e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/tables', async (req, res) => {
  try {
    const catalog = String(req.query.catalog || '').trim();
    const schema = String(req.query.schema || '').trim();

    if (!catalog || !schema) {
      return res.status(400).json({ error: 'Missing catalog or schema' });
    }

    const result = await executeSQL({
      statement: `
    SELECT table_name AS name
    FROM system.information_schema.tables
    WHERE table_catalog = ?
      AND table_schema = ?
    ORDER BY table_name
  `,
      parameters: paramVals(catalog, schema),
    });

    const rows = normalizeResult(result);
    res.json(rows.map(r => r.name));
  } catch (e) {
    console.error('[ERR] /api/tables', e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/columns', async (req, res) => {
  try {
    const catalog = String(req.query.catalog || '').trim();
    const schema = String(req.query.schema || '').trim();
    const table = String(req.query.table || '').trim();

    if (!catalog || !schema || !table) {
      return res.status(400).json({ error: 'Missing catalog, schema, or table' });
    }

    const result = await executeSQL({
      statement: `
    SELECT column_name AS name
    FROM system.information_schema.columns
    WHERE table_catalog = ?
      AND table_schema = ?
      AND table_name = ?
    ORDER BY ordinal_position
  `,
      parameters: paramVals(catalog, schema, table),
    });


    const rows = normalizeResult(result);
    res.json(rows.map(r => r.name));
  } catch (e) {
    console.error('[ERR] /api/columns', e);
    res.status(500).json({ error: e.message });
  }
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
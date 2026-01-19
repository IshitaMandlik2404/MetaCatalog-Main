
// server/dbsql.js
const axios = require('axios');

const HOST = process.env.DATABRICKS_HOST;
const TOKEN = process.env.DATABRICKS_TOKEN;
const WAREHOUSE_ID = process.env.DATABRICKS_WAREHOUSE_ID;
const DEFAULT_CATALOG = process.env.DATABRICKS_CATALOG;
const DEFAULT_SCHEMA  = process.env.DATABRICKS_SCHEMA;

/**
 * Maps INLINE JSON_ARRAY result to [{col:value,...}]
 */
function mapInlineJsonArrayToObjects(manifest, result) {
  const cols = manifest?.schema?.columns?.map(c => c.name) || [];
  const rows = result?.data_array || [];
  return rows.map(arr => Object.fromEntries(cols.map((c, i) => [c, arr[i]])));
}

/**
 * Execute SQL via Databricks Statements API
 * - Shows immediate FAILED message from POST
 * - Polls on PENDING/RUNNING and returns result or throws detailed error
 * - Supports parameter binding as { value: ... }
 */
async function executeSQL({
  statement,
  parameters = [],
  disposition = 'INLINE',
  format = 'JSON_ARRAY',
  waitTimeout = '15s',
  onWaitTimeout = 'CONTINUE',
  catalog = DEFAULT_CATALOG,
  schema = DEFAULT_SCHEMA,
  debug = false, // set true to log SQL + params
}) {
  if (!HOST || !TOKEN || !WAREHOUSE_ID) {
    throw new Error('Missing Databricks env configuration');
  }

  const url = `https://${HOST}/api/2.0/sql/statements`;
  const headers = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };
  const body = {
    warehouse_id: WAREHOUSE_ID,
    catalog,
    schema,
    statement,
    parameters,
    disposition,
    format,
    wait_timeout: waitTimeout,
    on_wait_timeout: onWaitTimeout,
  };

  if (debug) {
    console.log('[DBSQL:POST] statement:', statement);
    console.log('[DBSQL:POST] parameters:', parameters);
    console.log('[DBSQL:POST] catalog/schema:', catalog, schema);
  }

  const { data } = await axios.post(url, body, { headers });
  const state = data?.status?.state;

  // SUCCEEDED immediately
  if (state === 'SUCCEEDED') {
    return { rows: mapInlineJsonArrayToObjects(data.manifest, data.result), manifest: data.manifest };
  }

  // FAILED immediately: surface error message
  if (state === 'FAILED') {
    const msg = data?.status?.error?.message || 'Statement failed';
    if (debug) console.error('[DBSQL:FAILED immediate]', msg);
    throw new Error(msg);
  }

  // Otherwise poll using statement_id (PENDING/RUNNING)
  if (state === 'PENDING' || state === 'RUNNING') {
    const statusUrl = `https://${HOST}/api/2.0/sql/statements/${data.statement_id}`;
    let attempts = 0;

    while (true) {
      const poll = await axios.get(statusUrl, { headers });
      const s = poll.data?.status?.state;

      if (debug) {
        console.log(`[DBSQL:POLL #${attempts}] state:`, s);
      }

      if (s === 'SUCCEEDED' && poll.data?.result?.data_array) {
        return { rows: mapInlineJsonArrayToObjects(poll.data.manifest, poll.data.result), manifest: poll.data.manifest };
      }

      if (s === 'FAILED' || s === 'CANCELED') {
        const msg = poll.data?.status?.error?.message || `Statement ${s}`;
        if (debug) console.error('[DBSQL:POLL error]', msg);
        throw new Error(msg);
      }

      await new Promise(r => setTimeout(r, 1000));
      attempts += 1;
      if (attempts > 60) {
        throw new Error('Timeout polling statement result');
      }
    }
  }

  throw new Error(`Unexpected statement state: ${state}`);
}

module.exports = { executeSQL };


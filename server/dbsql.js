
const axios = require('axios');

const HOST = process.env.DATABRICKS_HOST;
const TOKEN = process.env.DATABRICKS_TOKEN;
const WAREHOUSE_ID = process.env.DATABRICKS_WAREHOUSE_ID;
const DEFAULT_CATALOG = process.env.DATABRICKS_CATALOG;
const DEFAULT_SCHEMA  = process.env.DATABRICKS_SCHEMA;

function mapInlineJsonArrayToObjects(manifest, result) {
  const cols = manifest?.schema?.columns?.map(c => c.name) || [];
  const rows = result?.data_array || [];
  return rows.map(arr => Object.fromEntries(cols.map((c, i) => [c, arr[i]])));
}

async function executeSQL({ statement, parameters = [], disposition = 'INLINE', format = 'JSON_ARRAY', waitTimeout = '15s', onWaitTimeout = 'CONTINUE', catalog = DEFAULT_CATALOG, schema = DEFAULT_SCHEMA }) {
  if (!HOST || !TOKEN || !WAREHOUSE_ID) throw new Error('Missing Databricks env configuration');
  const url = `https://${HOST}/api/2.0/sql/statements`;
  const headers = { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };
  const body = { warehouse_id: WAREHOUSE_ID, catalog, schema, statement, parameters, disposition, format, wait_timeout: waitTimeout, on_wait_timeout: onWaitTimeout };

  const { data } = await axios.post(url, body, { headers });

  if (data?.status?.state === 'SUCCEEDED') {
    return { rows: mapInlineJsonArrayToObjects(data.manifest, data.result), manifest: data.manifest };
  }

  if (data?.status?.state === 'PENDING') {
    const statusUrl = `https://${HOST}/api/2.0/sql/statements/${data.statement_id}`;
    let attempts = 0;
    while (true) {
      const poll = await axios.get(statusUrl, { headers });
      const s = poll.data?.status?.state;
      if (s === 'SUCCEEDED' && poll.data?.result?.data_array) {
        return { rows: mapInlineJsonArrayToObjects(poll.data.manifest, poll.data.result), manifest: poll.data.manifest };
      }
      if (s === 'FAILED' || s === 'CANCELED') {
        throw new Error(`Statement ${s}: ${poll.data?.status?.error?.message || 'Unknown error'}`);
      }
      await new Promise(r => setTimeout(r, 1000));
      attempts += 1;
      if (attempts > 60) throw new Error('Timeout polling statement result');
    }
  }

  throw new Error(`Unexpected statement state: ${data?.status?.state}`);
}

module.exports = { executeSQL };

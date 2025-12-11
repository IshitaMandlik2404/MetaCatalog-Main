
# Business Metadata UI (React + Node/Express + Databricks SQL)

This project scaffolds a UI with two frames (Configuration & Input) and a backend proxy that executes **Databricks SQL** via the **Statement Execution API**. It targets Delta tables:
- `business_metadata_config`
- `business_metadata_config_instance`

## Quick start

### Backend
```bash
cd server
cp .env.example .env
# Edit .env: DATABRICKS_HOST, DATABRICKS_TOKEN, DATABRICKS_WAREHOUSE_ID
npm install
npm start
```

### Frontend
```bash
cd client
npm install
npm start
# Open http://localhost:3000
```
The React dev server proxies API calls to `http://localhost:3001` (configured in `client/package.json`).

## Why a backend proxy?
Databricks REST endpoints do **not** support direct browser CORS. Calls must be made server‑side and proxied to the front‑end.

## References
- Statement Execution API (Azure ref & tutorial):
  - https://api-reference.cloud.databricks.com/azure/workspace/statementexecution/executestatement
  - https://docs.databricks.com/aws/en/dev-tools/sql-execution-tutorial
- API overview & polling behaviour:
  - https://docs.databricks.com/api/workspace/statementexecution
- CORS restriction (proxy pattern):
  - https://kb.databricks.com/security/cors-policy-error-when-trying-to-run-databricks-api-from-a-browser-based-application
  - https://stackoverflow.com/questions/75952412/azure-databricks-rest-api-blocked-by-cors-policy-while-making-request-through-re
- Optional Node.js driver for Databricks SQL:
  - https://learn.microsoft.com/en-us/azure/databricks/dev-tools/nodejs-sql-driver
  - https://docs.databricks.com/aws/en/dev-tools/nodejs-sql-driver
```
**Tip**: For large result sets, switch to `EXTERNAL_LINKS` disposition and stream chunks from the returned SAS URLs.
```

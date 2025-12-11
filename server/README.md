
# Metadata Backend (Databricks SQL Proxy)

This Express server proxies requests to the **Databricks SQL Statement Execution API** to query and modify Delta tables.

## Setup
1. Create `.env` from `.env.example` and fill host/token/warehouse.
2. Install & run:
   ```bash
   npm install
   npm start
   ```

## Notes
- Uses `POST /api/2.0/sql/statements` with **named parameters** and **INLINE + JSON_ARRAY** disposition for small results. For large results, switch to **EXTERNAL_LINKS**.
- Browser calls must go through this backend due to **CORS restrictions on Databricks REST endpoints**.

## References
- Databricks Statement Execution API (reference & tutorial):
  - https://api-reference.cloud.databricks.com/azure/workspace/statementexecution/executestatement
  - https://docs.databricks.com/aws/en/dev-tools/sql-execution-tutorial
- Statement Execution API overview & polling:
  - https://docs.databricks.com/api/workspace/statementexecution
- CORS limitation & proxy guidance:
  - https://kb.databricks.com/security/cors-policy-error-when-trying-to-run-databricks-api-from-a-browser-based-application
  - https://stackoverflow.com/questions/75952412/azure-databricks-rest-api-blocked-by-cors-policy-while-making-request-through-re

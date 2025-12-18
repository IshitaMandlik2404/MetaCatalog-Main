
import axios from 'axios';
export const api = axios.create({ baseURL: '/api' });

export const getSubjects = () => api.get('/config/subjects').then(r => r.data);
export const getAttributeTypes = (subject) => api.get('/config/attribute-types', { params: { subject }}).then(r => r.data);
export const addConfig = (payload) => api.post('/config', payload).then(r => r.data);
export const deleteConfig = (payload) => api.delete('/config', { data: payload }).then(r => r.data);

export const searchMetadata = (text) => api.post('/metadata/search', { text }).then(r => r.data);
export const getEntities = (level) => api.get('/entities', { params: { level }}).then(r => r.data);
export const getMetadataAttributes = (level) => api.get('/metadata/attributes',{ params: {level}}).then(r => r.data);
export const upsertMetadata = (payload) => api.post('/catalog/metadata', payload).then(r => r.data);
export const deleteMetadata = (payload) => api.delete('/catalog/metadata', { data: payload }).then(r => r.data);
export const getCatalogs = () => api.get('/catalogs').then(r => r.data);
export const getSchemas = (catalog) => api.get('/schemas',{ params: { catalog }}).then(r => r.data);
export const getTables = (catalog, schema) => api.get('/tables',{ params: { catalog, schema }}).then(r => r.data);
export const getColumns = (catalog, schema, table) => api.get('/columns',{ params: { catalog, schema, table }}).then(r => r.data);

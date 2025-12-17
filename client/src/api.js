
import axios from 'axios';
export const api = axios.create({ baseURL: '/api' });

// CONFIG
export const getSubjects = () => api.get('/config/subjects').then(r => r.data);
export const getAttributeTypes = (subject) => api.get('/config/attribute-types', { params: { subject }}).then(r => r.data);
export const addConfig = (payload) => api.post('/config', payload).then(r => r.data);
export const deleteConfig = (payload) => api.delete('/config', { data: payload }).then(r => r.data);

// INPUT
export const searchMetadata = (text) => api.post('/metadata/search', { text }).then(r => r.data);
export const getEntities = (level) => api.get('/entities', { params: { level }}).then(r => r.data);
export const getMetadataAttributes = () => api.get('/metadata/attributes').then(r => r.data);
export const getMetadata = (level, entity) => api.get('/metadata', { params: { level, entity }}).then(r => r.data);
export const upsertMetadata = (payload) => api.post('/metadata', payload).then(r => r.data);
export const deleteMetadata = (payload) => api.delete('/metadata', { data: payload }).then(r => r.data);

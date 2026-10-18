import api from "./api";

/* ── Auth ───────────────────────────────────────────────────────────── */
export const authApi = {
  login: (data) => api.post("/auth/login", data),
  register: (data) => api.post("/auth/register", data),
  google: (credential) => api.post("/auth/google", { credential }),
  me: () => api.get("/auth/me"),
  updateProfile: (data) => api.put("/auth/profile", data),
  seedDemo: () => api.post("/auth/seed-demo"),
  createRazorpayOrder: (data) => api.post("/auth/create-razorpay-order", data),
  subscribe: (data) => api.post("/auth/subscribe", data),
  requestOtp: (data) => api.post("/auth/otp/request", data),
  verifyOtp: (data) => api.post("/auth/otp/verify", data),
  revokeSessions: (data) => api.post("/auth/account/revoke-sessions", data),
};

/* ── Leads ──────────────────────────────────────────────────────────── */
export const leadsApi = {
  list: (params) => api.get("/leads", { params }),
  get: (id) => api.get(`/leads/${id}`),
  create: (data) => api.post("/leads", data),
  update: (id, data) => api.put(`/leads/${id}`, data),
  remove: (id) => api.delete(`/leads/${id}`),
  reorder: (updates) => api.patch("/leads/reorder", { updates }),
  sendEmail: (id, data) => api.post(`/leads/${id}/send-email`, data),
  bulkCreate: (data) => api.post("/leads/bulk", data),
  uploadAttachment: (id, formData) => api.post(`/leads/${id}/attachments`, formData, { headers: { "Content-Type": "multipart/form-data" } }),
  deleteAttachment: (id, attachmentId) => api.delete(`/leads/${id}/attachments/${attachmentId}`),
  getActivity: (id) => api.get(`/leads/${id}/activity`),
  assignLeads: (data) => api.post("/leads/assign", data),
};

/* ── Contacts ───────────────────────────────────────────────────────── */
export const contactsApi = {
  list: (params) => api.get("/contacts", { params }),
  get: (id) => api.get(`/contacts/${id}`),
  create: (data) => api.post("/contacts", data),
  update: (id, data) => api.put(`/contacts/${id}`, data),
  remove: (id) => api.delete(`/contacts/${id}`),
};

/* ── Notes ──────────────────────────────────────────────────────────── */
export const notesApi = {
  list: (params) => api.get("/notes", { params }),
  create: (data) => api.post("/notes", data),
  update: (id, data) => api.put(`/notes/${id}`, data),
  remove: (id) => api.delete(`/notes/${id}`),
};

/* ── Tasks ──────────────────────────────────────────────────────────── */
export const tasksApi = {
  list: (params) => api.get("/tasks", { params }),
  create: (data) => api.post("/tasks", data),
  update: (id, data) => api.put(`/tasks/${id}`, data),
  remove: (id) => api.delete(`/tasks/${id}`),
};

/* ── AI ─────────────────────────────────────────────────────────────── */
export const aiApi = {
  status: () => api.get("/ai/status"),
  leadSummary: (data) => api.post("/ai/lead-summary", data),
  generateEmail: (data) => api.post("/ai/generate-email", data),
  salesInsights: (data) => api.post("/ai/sales-insights", data),
  getAttention: () => api.get("/ai/attention"),
  chat: (data) => api.post("/ai/chat", data),
};

/* ── Analytics ──────────────────────────────────────────────────────── */
export const analyticsApi = {
  overview: (params) => api.get("/analytics/overview", { params }),
};

/* ── Outreach & Templates ───────────────────────────────────────────── */
export const outreachApi = {
  getTemplates: () => api.get("/outreach/templates"),
  createTemplate: (data) => api.post("/outreach/templates", data),
  updateTemplate: (id, data) => api.put(`/outreach/templates/${id}`, data),
  deleteTemplate: (id) => api.delete(`/outreach/templates/${id}`),

  getSequences: () => api.get("/outreach/sequences"),
  createSequence: (data) => api.post("/outreach/sequences", data),
  toggleSequence: (id) => api.put(`/outreach/sequences/${id}/toggle`),

  getQueue: () => api.get("/outreach/queue"),
  sendQueueItem: (id) => api.post(`/outreach/queue/${id}/send`),
  dismissQueueItem: (id) => api.delete(`/outreach/queue/${id}`),
};

/* ── Team & RBAC Roles ──────────────────────────────────────────────── */
export const teamApi = {
  getMembers: () => api.get("/team"),
  inviteMember: (data) => api.post("/team/invite", data),
  updateRole: (userId, data) => api.put(`/team/${userId}/role`, data),
  updatePermissions: (userId, data) => api.put(`/team/${userId}/permissions`, data),
  toggleStatus: (userId, data) => api.put(`/team/${userId}/status`, data),
  removeMember: (userId) => api.delete(`/team/${userId}`),
};

/* ── Organization & Audit Logs ─────────────────────────────────────── */
export const orgApi = {
  getOrganization: () => api.get("/organization"),
  updateOrganization: (data) => api.put("/organization", data),
  getAuditLogs: (params) => api.get("/organization/audit-logs", { params }),
};

/* ── Team Chat ──────────────────────────────────────────────────────── */
export const chatApi = {
  getConversations: () => api.get("/chat/conversations"),
  getOrCreateDirect: (recipientId) => api.post("/chat/conversations/direct", { recipientId }),
  createGroup: (data) => api.post("/chat/conversations/group", data),
  getMessages: (conversationId, params) => api.get(`/chat/conversations/${conversationId}/messages`, { params }),
  sendMessage: (conversationId, data) => api.post(`/chat/conversations/${conversationId}/messages`, data),
  markAsRead: (conversationId) => api.patch(`/chat/conversations/${conversationId}/read`),
  markAsDelivered: (conversationId, messageIds) =>
    api.post(`/chat/conversations/${conversationId}/delivered`, { messageIds }),
  updatePreferences: (data) => api.patch("/chat/preferences", data),
  getTeammates: () => api.get("/chat/teammates"),
};

export const sendSuccess = (res, data, status = 200) => res.status(status).json({ ok: true, data });
export const sendError = (res, errorCode, message, status = 400) => res.status(status).json({ ok: false, errorCode, message });

import { Response } from 'express';

export const sendSuccess = <T>(res: Response, data: T, status = 200) =>
  res.status(status).json({ ok: true, data });

export const sendError = (res: Response, errorCode: string, message: string, status = 400) =>
  res.status(status).json({ ok: false, errorCode, message });

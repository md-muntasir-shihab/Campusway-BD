import { Request, Response } from 'express';

import { AuthRequest } from '../middlewares/auth';
import {
    archiveContactMessage,
    createContactMessage,
    deleteContactMessage,
    getContactMessageById,
    listContactMessages,
    markContactMessageRead,
    patchContactMessage,
    resolveContactMessage,
} from '../services/contactMessageService';
import { getClientIp, getDeviceInfo } from '../utils/requestMeta';
import { ResponseBuilder } from '../utils/responseBuilder';

function isValidEmail(value: string): boolean {
    return /^\S+@\S+\.\S+$/.test(value);
}

export async function submitContactMessage(req: AuthRequest, res: Response): Promise<void> {
    try {
        const body = (req.body || {}) as Record<string, unknown>;
        const name = String(body.name || '').trim();
        const email = String(body.email || '').trim();
        const phone = String(body.phone || '').trim();
        const subject = String(body.subject || '').trim();
        const message = String(body.message || '').trim();
        const topic = String(body.topic || '').trim().toLowerCase();

        if (!name || !email || !subject || !message) {
            ResponseBuilder.send(res, 400, ResponseBuilder.error('VALIDATION_ERROR', 'Missing required fields'));
            return;
        }
        if (!isValidEmail(email)) {
            ResponseBuilder.send(res, 400, ResponseBuilder.error('VALIDATION_ERROR', 'Invalid email format'));
            return;
        }

        const created = await createContactMessage({
            actorUserId: req.user?._id ? String(req.user._id) : null,
            name: name.slice(0, 100),
            email,
            phone: phone.slice(0, 40),
            subject: subject.slice(0, 200),
            message: message.slice(0, 5000),
            ip: getClientIp(req),
            userAgent: getDeviceInfo(req),
            metadata: {
                consent: body.consent,
                ...(topic ? { topic } : {}),
            },
        });

        ResponseBuilder.send(res, 201, ResponseBuilder.created({ id: created._id }, 'Message sent successfully'));
    } catch (error) {
        console.error('submitContactMessage error:', error);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}

export const submitPublicContactMessage = submitContactMessage;

export async function adminGetContactMessages(req: Request, res: Response): Promise<void> {
    try {
        const result = await listContactMessages({
            page: Number(req.query.page || 1),
            limit: Number(req.query.limit || 20),
            filter: String(req.query.filter || req.query.status || 'all').trim().toLowerCase() as any,
            search: String(req.query.search || '').trim(),
        });
        ResponseBuilder.send(res, 200, ResponseBuilder.success(result));
    } catch (error) {
        console.error('adminGetContactMessages error:', error);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}

export async function adminGetContactMessageById(req: Request, res: Response): Promise<void> {
    try {
        const item = await getContactMessageById(String(req.params.id || '').trim(), { markOpened: true });
        if (!item) {
            ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'Message not found'));
            return;
        }
        ResponseBuilder.send(res, 200, ResponseBuilder.success({ item }));
    } catch (error) {
        console.error('adminGetContactMessageById error:', error);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}

export async function adminUpdateContactMessage(req: Request, res: Response): Promise<void> {
    try {
        const body = (req.body || {}) as Record<string, unknown>;
        const item = await patchContactMessage(String(req.params.id || '').trim(), {
            status: body.status as any,
            unreadByAdmin: body.unreadByAdmin as boolean | undefined,
            isRead: body.isRead as boolean | undefined,
            isReplied: body.isReplied as boolean | undefined,
        });
        if (!item) {
            ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'Message not found'));
            return;
        }
        ResponseBuilder.send(res, 200, ResponseBuilder.success({ item }, 'Contact message updated'));
    } catch (error) {
        console.error('adminUpdateContactMessage error:', error);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}

export async function adminMarkContactMessageRead(req: Request, res: Response): Promise<void> {
    try {
        const item = await markContactMessageRead(String(req.params.id || '').trim());
        if (!item) {
            ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'Message not found'));
            return;
        }
        ResponseBuilder.send(res, 200, ResponseBuilder.success({ item }, 'Contact message marked as read'));
    } catch (error) {
        console.error('adminMarkContactMessageRead error:', error);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}

export async function adminResolveContactMessage(req: Request, res: Response): Promise<void> {
    try {
        const item = await resolveContactMessage(String(req.params.id || '').trim());
        if (!item) {
            ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'Message not found'));
            return;
        }
        ResponseBuilder.send(res, 200, ResponseBuilder.success({ item }, 'Contact message resolved'));
    } catch (error) {
        console.error('adminResolveContactMessage error:', error);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}

export async function adminArchiveContactMessage(req: Request, res: Response): Promise<void> {
    try {
        const item = await archiveContactMessage(String(req.params.id || '').trim());
        if (!item) {
            ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'Message not found'));
            return;
        }
        ResponseBuilder.send(res, 200, ResponseBuilder.success({ item }, 'Contact message archived'));
    } catch (error) {
        console.error('adminArchiveContactMessage error:', error);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}

export async function adminDeleteContactMessage(req: Request, res: Response): Promise<void> {
    try {
        const deleted = await deleteContactMessage(String(req.params.id || '').trim());
        if (!deleted) {
            ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'Message not found'));
            return;
        }
        ResponseBuilder.send(res, 200, ResponseBuilder.success(null, 'Message deleted'));
    } catch (error) {
        console.error('adminDeleteContactMessage error:', error);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}

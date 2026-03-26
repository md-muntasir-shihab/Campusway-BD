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
            res.status(400).json({ message: 'Missing required fields' });
            return;
        }
        if (!isValidEmail(email)) {
            res.status(400).json({ message: 'Invalid email format' });
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

        res.status(201).json({
            message: 'Message sent successfully',
            id: created._id,
        });
    } catch (error) {
        console.error('submitContactMessage error:', error);
        res.status(500).json({ message: 'Server error' });
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
        res.json(result);
    } catch (error) {
        console.error('adminGetContactMessages error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}

export async function adminGetContactMessageById(req: Request, res: Response): Promise<void> {
    try {
        const item = await getContactMessageById(String(req.params.id || '').trim(), { markOpened: true });
        if (!item) {
            res.status(404).json({ message: 'Message not found' });
            return;
        }
        res.json({ item });
    } catch (error) {
        console.error('adminGetContactMessageById error:', error);
        res.status(500).json({ message: 'Server error' });
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
            res.status(404).json({ message: 'Message not found' });
            return;
        }
        res.json({ item, message: 'Contact message updated' });
    } catch (error) {
        console.error('adminUpdateContactMessage error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}

export async function adminMarkContactMessageRead(req: Request, res: Response): Promise<void> {
    try {
        const item = await markContactMessageRead(String(req.params.id || '').trim());
        if (!item) {
            res.status(404).json({ message: 'Message not found' });
            return;
        }
        res.json({ item, message: 'Contact message marked as read' });
    } catch (error) {
        console.error('adminMarkContactMessageRead error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}

export async function adminResolveContactMessage(req: Request, res: Response): Promise<void> {
    try {
        const item = await resolveContactMessage(String(req.params.id || '').trim());
        if (!item) {
            res.status(404).json({ message: 'Message not found' });
            return;
        }
        res.json({ item, message: 'Contact message resolved' });
    } catch (error) {
        console.error('adminResolveContactMessage error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}

export async function adminArchiveContactMessage(req: Request, res: Response): Promise<void> {
    try {
        const item = await archiveContactMessage(String(req.params.id || '').trim());
        if (!item) {
            res.status(404).json({ message: 'Message not found' });
            return;
        }
        res.json({ item, message: 'Contact message archived' });
    } catch (error) {
        console.error('adminArchiveContactMessage error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}

export async function adminDeleteContactMessage(req: Request, res: Response): Promise<void> {
    try {
        const deleted = await deleteContactMessage(String(req.params.id || '').trim());
        if (!deleted) {
            res.status(404).json({ message: 'Message not found' });
            return;
        }
        res.json({ message: 'Message deleted' });
    } catch (error) {
        console.error('adminDeleteContactMessage error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}

import { Request, Response } from 'express';
import mongoose from 'mongoose';
import University from '../models/University';
import HomeSettings from '../models/HomeSettings';
import News from '../models/News';
import Exam from '../models/Exam';
import Question from '../models/Question';
import User from '../models/User';
import ManualPayment from '../models/ManualPayment';
import SupportTicket from '../models/SupportTicket';
import ContactMessage from '../models/ContactMessage';
import Resource from '../models/Resource';
import NotificationJob from '../models/NotificationJob';
import UserSubscription from '../models/UserSubscription';
import SubscriptionPlan from '../models/SubscriptionPlan';
import TeamInvite from '../models/TeamInvite';
import TeamRole from '../models/TeamRole';
import SecurityAlertLog from '../models/SecurityAlertLog';

export const adminGetDashboardSummary = async (_req: Request, res: Response): Promise<void> => {
    try {
        const now = new Date();
        const startOfToday = new Date(now);
        startOfToday.setHours(0, 0, 0, 0);
        const endOfToday = new Date(startOfToday);
        endOfToday.setDate(endOfToday.getDate() + 1);
        const renewalDueUntil = new Date(now);
        renewalDueUntil.setDate(renewalDueUntil.getDate() + 7);
        const staffRoles = ['superadmin', 'admin', 'moderator', 'editor', 'viewer', 'support_agent', 'finance_agent'];

        const [
            totalUniversities,
            activeUniversities,
            featuredUniversities,
            homeSettings,
            pendingNews,
            publishedToday,
            liveExams,
            upcomingExams,
            totalQuestions,
            totalActiveStudents,
            suspendedStudents,
            pendingPaymentStudents,
            pendingPaymentApprovals,
            paidToday,
            unreadSupportTickets,
            unreadContactMessages,
            publicResources,
            featuredResources,
            totalCampaigns,
            queuedOrProcessingCampaigns,
            failedCampaignsToday,
            activeSubscribers,
            renewalDueSubscribers,
            activePlans,
            activeStaff,
            pendingInvites,
            activeRoles,
            unreadSecurityAlerts,
            criticalSecurityAlerts,
        ] = await Promise.all([
            University.countDocuments({}),
            University.countDocuments({ isActive: true, isArchived: { $ne: true } }),
            University.countDocuments({ featured: true }),
            HomeSettings.findOne().lean(),
            News.countDocuments({ status: { $in: ['pending_review', 'draft'] } }),
            News.countDocuments({ isPublished: true, publishDate: { $gte: startOfToday, $lt: endOfToday } }),
            Exam.countDocuments({ isPublished: true, status: 'live' }),
            Exam.countDocuments({ isPublished: true, status: 'scheduled' }),
            Question.countDocuments({}),
            User.countDocuments({ role: 'student', status: 'active' }),
            User.countDocuments({ role: 'student', status: 'suspended' }),
            User.countDocuments({ role: 'student', status: 'pending' }),
            ManualPayment.countDocuments({ status: 'pending' }),
            ManualPayment.countDocuments({
                status: 'paid',
                $or: [
                    { paidAt: { $gte: startOfToday, $lt: endOfToday } },
                    { paidAt: { $exists: false }, date: { $gte: startOfToday, $lt: endOfToday } },
                    { paidAt: null, date: { $gte: startOfToday, $lt: endOfToday } },
                ],
            }),
            SupportTicket.countDocuments({
                $or: [
                    { unreadCountForAdmin: { $gt: 0 } },
                    {
                        unreadCountForAdmin: { $exists: false },
                        status: { $in: ['open', 'in_progress'] },
                    },
                ],
            }),
            ContactMessage.countDocuments({ unreadByAdmin: true }),
            Resource.countDocuments({
                isPublic: true,
                publishDate: { $lte: now },
                $or: [{ expiryDate: { $exists: false } }, { expiryDate: null }, { expiryDate: { $gt: now } }],
            }),
            Resource.countDocuments({
                isPublic: true,
                isFeatured: true,
                publishDate: { $lte: now },
                $or: [{ expiryDate: { $exists: false } }, { expiryDate: null }, { expiryDate: { $gt: now } }],
            }),
            TeamInvite.countDocuments({ status: { $in: ['pending', 'sent'] } }),
            TeamRole.countDocuments({ isActive: true }),
            SecurityAlertLog ? SecurityAlertLog.countDocuments({ isRead: false }).catch(() => 0) : Promise.resolve(0),
            SecurityAlertLog ? SecurityAlertLog.countDocuments({ isRead: false, severity: 'critical' }).catch(() => 0) : Promise.resolve(0),
            NotificationJob ? NotificationJob.countDocuments({ isTestSend: { $ne: true } }).catch(() => 0) : Promise.resolve(0),
            NotificationJob ? NotificationJob.countDocuments({ isTestSend: { $ne: true }, status: { $in: ['queued', 'processing'] } }).catch(() => 0) : Promise.resolve(0),
            NotificationJob ? NotificationJob.countDocuments({ isTestSend: { $ne: true }, status: 'failed', updatedAt: { $gte: startOfToday, $lt: endOfToday } }).catch(() => 0) : Promise.resolve(0),
            UserSubscription ? UserSubscription.countDocuments({ status: 'active', expiresAtUTC: { $gt: now } }).catch(() => 0) : Promise.resolve(0),
            UserSubscription ? UserSubscription.countDocuments({ status: 'active', expiresAtUTC: { $gt: now, $lte: renewalDueUntil } }).catch(() => 0) : Promise.resolve(0),
            SubscriptionPlan ? SubscriptionPlan.countDocuments({ enabled: true, isArchived: { $ne: true } }).catch(() => 0) : Promise.resolve(0),
            User ? User.countDocuments({ role: { $in: staffRoles }, status: 'active' }).catch(() => 0) : Promise.resolve(0),
        ]);

        const highlightedCategories = Array.isArray(homeSettings?.highlightedCategories)
            ? homeSettings.highlightedCategories.filter((item: any) => item?.enabled !== false).length
            : 0;
        const featuredHomeUniversities = Array.isArray(homeSettings?.featuredUniversities)
            ? homeSettings.featuredUniversities.filter((item: any) => item?.enabled !== false).length
            : 0;
        const enabledSections = homeSettings?.sectionVisibility
            ? Object.values(homeSettings.sectionVisibility).filter(Boolean).length
            : 0;

        const dbStateMap: Record<number, 'down' | 'connected'> = {
            0: 'down',
            1: 'connected',
            2: 'down',
            3: 'down',
            99: 'down',
        };
        const db = dbStateMap[mongoose.connection.readyState] || 'down';
        const unreadSupportMessages = unreadSupportTickets + unreadContactMessages;

        res.json({
            universities: {
                total: totalUniversities,
                active: activeUniversities,
                featured: featuredUniversities,
            },
            home: {
                highlightedCategories,
                featuredUniversities: featuredHomeUniversities,
                enabledSections,
            },
            news: {
                pendingReview: pendingNews,
                publishedToday,
            },
            exams: {
                upcoming: upcomingExams,
                live: liveExams,
            },
            questionBank: {
                totalQuestions,
            },
            students: {
                totalActive: totalActiveStudents,
                pendingPayment: pendingPaymentStudents,
                suspended: suspendedStudents,
            },
            payments: {
                pendingApprovals: pendingPaymentApprovals,
                paidToday,
            },
            financeCenter: {
                pendingApprovals: pendingPaymentApprovals,
                paidToday,
            },
            subscriptions: {
                activeSubscribers,
                renewalDue: renewalDueSubscribers,
                activePlans,
            },
            resources: {
                publicResources,
                featuredResources,
            },
            campaigns: {
                totalCampaigns,
                queuedOrProcessing: queuedOrProcessingCampaigns,
                failedToday: failedCampaignsToday,
            },
            supportCenter: {
                unreadMessages: unreadSupportMessages,
                unreadTickets: unreadSupportTickets,
                unreadContactMessages,
            },
            teamAccess: {
                activeStaff,
                pendingInvites,
                activeRoles,
            },
            security: {
                unreadAlerts: unreadSecurityAlerts,
                criticalAlerts: criticalSecurityAlerts,
                db,
            },
            systemStatus: {
                db,
                timeUTC: now.toISOString(),
            },
        });
    } catch (error) {
        console.error('adminGetDashboardSummary error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};


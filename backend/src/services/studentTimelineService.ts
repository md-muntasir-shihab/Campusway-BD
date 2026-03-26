import mongoose from 'mongoose';

import StudentContactTimeline from '../models/StudentContactTimeline';

export async function addSystemTimelineEvent(
    studentId: mongoose.Types.ObjectId,
    type: string,
    content: string,
    metadata?: Record<string, unknown>,
    linkedId?: mongoose.Types.ObjectId,
): Promise<void> {
    await StudentContactTimeline.create({
        studentId,
        type,
        content,
        linkedId,
        sourceType: 'system',
        metadata,
    });
}

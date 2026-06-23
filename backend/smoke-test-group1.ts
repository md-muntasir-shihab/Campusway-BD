import axios from 'axios';
import mongoose from 'mongoose';

const API_BASE = 'http://localhost:5003/api';

async function runSmokeTest() {
    console.log('--- Starting Group 1 Smoke Test (Exam Builder) ---');

    try {
        // 1. Admin Login
        console.log('Logging in as admin...');
        const loginRes = await axios.post(`${API_BASE}/auth/login`, {
            email: 'admin@campusway.local',
            password: 'password123'
        });
        const token = loginRes.data.token || loginRes.data.accessToken;
        const headers = { Authorization: `Bearer ${token}` };
        console.log('Login successful.');

        // 2. Step 1: Create Draft
        console.log('Step 1: Creating Draft...');
        const draftRes = await axios.post(`${API_BASE}/v1/exams`, {
            title: 'Smoke Test Exam',
            exam_type: 'Practice',
            duration: 30,
            durationMinutes: 30
        }, { headers });
        const examId = draftRes.data.data?._id || draftRes.data.data?.id;
        console.log(`Draft created with ID: ${examId}`);

        // 3. Step 2: Auto-Pick Questions
        console.log('Step 2: Auto-picking questions...');
        const pickRes = await axios.post(`${API_BASE}/v1/exams/${examId}/auto-pick`, {
            count: 2,
            difficultyDistribution: { easy: 50, medium: 50, hard: 0 }
        }, { headers });
        console.log(`Questions auto-picked: ${pickRes.data.data.questions.length}`);

        // 4. Step 3: Update Settings
        console.log('Step 3: Updating Settings...');
        await axios.put(`${API_BASE}/v1/exams/${examId}/settings`, {
            marksPerQuestion: 1,
            negativeMarking: 0.25,
            passPercentage: 40,
            shuffleQuestions: true,
            shuffleOptions: true,
            showResultMode: 'immediately',
            maxAttempts: 2,
            assignedGroups: [],
            visibility: 'public',
            antiCheat: {
                tab_switch_detect: true,
                fullscreen_mode: true,
                copy_paste_disabled: true
            }
        }, { headers });
        console.log('Settings updated successfully.');

        // 5. Step 4: Update Scheduling
        console.log('Step 4: Updating Scheduling...');
        const now = new Date();
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        await axios.put(`${API_BASE}/v1/exams/${examId}/scheduling`, {
            exam_schedule_type: 'practice',
            startTime: now.toISOString(),
            endTime: tomorrow.toISOString(),
            pricing: {
                isFree: true,
                amountBDT: 0,
                couponCodes: []
            }
        }, { headers });
        console.log('Scheduling updated successfully.');

        // 6. Step 5: Publish Exam
        console.log('Step 5: Publishing Exam...');
        const publishRes = await axios.post(`${API_BASE}/v1/exams/${examId}/publish`, {}, { headers });
        console.log(`Exam published successfully. Status: ${publishRes.data.data.status}, isPublished: ${publishRes.data.data.isPublished}`);

        // 7. Preview Exam
        console.log('Previewing Exam...');
        const previewRes = await axios.get(`${API_BASE}/v1/exams/${examId}/preview`, { headers });
        console.log(`Exam preview fetched successfully. Questions count: ${previewRes.data.data.questionOrder.length}`);

        console.log('--- Group 1 Smoke Test Passed ---');
    } catch (err: any) {
        console.error('Smoke Test Failed!');
        if (err.response) {
            console.error('Response:', err.response.data);
        } else {
            console.error(err.message);
        }
    }
}

runSmokeTest();

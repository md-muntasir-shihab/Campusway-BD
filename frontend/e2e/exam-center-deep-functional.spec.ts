import { expect, Page, test, type APIRequestContext } from '@playwright/test';
import ExcelJS from 'exceljs';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const ADMIN = { email: 'admin@campusway.com', password: 'Admin@123456' };
const STUDENT = { email: 'student@campusway.com', password: 'Student@123456' };
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ARTIFACT_DIR = path.resolve(__dirname, '../../qa-artifacts/exam-center-e2e');

type HierarchyNode = {
    _id: string;
    title?: { en?: string; bn?: string };
    code?: string;
    children?: HierarchyNode[];
};

test.describe.serial('Exam Center deep functional flow', () => {
    const runId = `${Date.now()}`;
    const names = {
        group: `EC Auto Group ${runId}`,
        subGroup: `EC Auto SubGroup ${runId}`,
        subject: `EC Auto Subject ${runId}`,
        chapter: `EC Auto Chapter ${runId}`,
        topic: `EC Auto Topic ${runId}`,
        exam: `EC Demo Builder Exam ${runId}`,
    };

    let importedQuestionIds: string[] = [];
    let demoExamId = '';
    let importFile = '';

    test.beforeAll(async () => {
        await fs.mkdir(ARTIFACT_DIR, { recursive: true });
        importFile = await writeQuestionImportWorkbook(runId, names);
    });

    test('admin imports questions, exports them, and hierarchy is auto-created', async ({ page }) => {
        await loginAdminUi(page);
        await page.goto('/__cw_admin__/exam-center/question-bank');
        await expect(page.getByRole('heading', { name: /Question Bank/i }).first()).toBeVisible();

        const importResponsePromise = page.waitForResponse((response) =>
            response.url().includes('/api/v1/questions/import') && response.request().method() === 'POST',
        );
        await page.locator('input[type="file"][accept*=".xlsx"]').setInputFiles(importFile);
        const importResponse = await importResponsePromise;
        expect(importResponse.status(), await importResponse.text()).toBe(200);
        const importBody = await importResponse.json();
        expect(importBody?.data?.success).toBe(3);
        expect(importBody?.data?.failed).toBe(0);
        expect(importBody?.data?.hierarchyCreated).toBeGreaterThanOrEqual(5);
        await page.screenshot({ path: path.join(ARTIFACT_DIR, '01-question-import.png'), fullPage: true });

        const exportedPath = await exportQuestionBankFromUi(page);
        await expect.poll(async () => (await fs.stat(exportedPath)).size).toBeGreaterThan(100);

        importedQuestionIds = await getImportedQuestionIds(page.context().request, runId);
        expect(importedQuestionIds).toHaveLength(3);

        const treeResponse = await page.context().request.get('/api/v1/question-hierarchy/tree');
        expect(treeResponse.status(), await treeResponse.text()).toBe(200);
        const treeBody = await treeResponse.json();
        const chain = findHierarchyChain(treeBody.data?.groups || [], names);
        expect(chain.group?._id, 'group was auto-created').toBeTruthy();
        expect(chain.subGroup?._id, 'sub-group was auto-created').toBeTruthy();
        expect(chain.subject?._id, 'subject was auto-created').toBeTruthy();
        expect(chain.chapter?._id, 'chapter was auto-created').toBeTruthy();
        expect(chain.topic?._id, 'topic was auto-created').toBeTruthy();

        await page.goto('/__cw_admin__/exam-center/hierarchy');
        await expect(page.getByText(names.group)).toBeVisible({ timeout: 20_000 });
        await page.screenshot({ path: path.join(ARTIFACT_DIR, '02-auto-created-hierarchy.png'), fullPage: true });
    });

    test('exam center submodules load without frontend/backend errors', async ({ page }) => {
        await loginAdminUi(page);
        const routes = [
            { path: '/__cw_admin__/exam-center/hierarchy', text: /Question Hierarchy|Hierarchy/i },
            { path: '/__cw_admin__/exam-center/question-bank', text: /Question Bank/i },
            { path: '/__cw_admin__/exam-center/exam-builder', text: /Exam Builder/i },
            { path: '/__cw_admin__/exam-center/grading', text: /Written Grading|Select an exam/i },
            { path: '/__cw_admin__/exam-center/anti-cheat', text: /Anti-Cheat|Select an exam/i },
            { path: '/__cw_admin__/exam-center/notifications', text: /Notification|Exam Notifications/i },
        ];

        for (const route of routes) {
            const tracker = attachHealthTracker(page);
            await page.goto(route.path);
            await expect(page.locator('body')).toBeVisible();
            await expect(page.getByText(route.text).first()).toBeVisible({ timeout: 20_000 });
            expect(page.url()).not.toContain('/login');
            expect(tracker.pageErrors, route.path).toEqual([]);
            expect(tracker.serverErrors, route.path).toEqual([]);
            tracker.detach();
            await page.screenshot({
                path: path.join(ARTIFACT_DIR, `module-${route.path.split('/').pop() || 'root'}.png`),
                fullPage: true,
            });
        }
    });

    test('exam builder UI creates and publishes a demo exam using auto-pick', async ({ page }) => {
        test.skip(importedQuestionIds.length !== 3, 'Question import did not complete.');
        await loginAdminUi(page);
        await page.goto('/__cw_admin__/exam-center/exam-builder');
        await expect(page.getByRole('heading', { name: /Exam Builder/i }).first()).toBeVisible();

        await page.getByLabel(/Title \(English\)/i).fill(names.exam);
        await page.getByLabel(/Duration/i).fill('12');
        await page.getByLabel('Group', { exact: true }).selectOption({ label: names.group });

        const draftResponsePromise = page.waitForResponse((response) =>
            response.url().endsWith('/api/v1/exams') && response.request().method() === 'POST',
        );
        await page.getByRole('button', { name: /Next/i }).click();
        const draftResponse = await draftResponsePromise;
        expect(draftResponse.status(), await draftResponse.text()).toBe(201);
        const draftBody = await draftResponse.json();
        demoExamId = String(draftBody.data?._id || '');
        expect(demoExamId).toBeTruthy();

        await page.getByRole('button', { name: /Auto-Pick/i }).click();
        await page.getByLabel(/Count/i).fill('3');
        const autoPickResponsePromise = page.waitForResponse((response) =>
            response.url().includes(`/api/v1/exams/${demoExamId}/auto-pick`) && response.request().method() === 'POST',
        );
        await page.getByRole('button', { name: /Apply Auto-Pick/i }).click();
        const autoPickResponse = await autoPickResponsePromise;
        expect(autoPickResponse.status(), await autoPickResponse.text()).toBe(200);
        const autoPickBody = await autoPickResponse.json();
        expect(autoPickBody.data?.questionIds).toHaveLength(3);
        await expect(page.getByText(/Auto-picked 3 questions/i).first()).toBeVisible();

        await page.screenshot({ path: path.join(ARTIFACT_DIR, '03-builder-autopick.png'), fullPage: true });

        await waitForApiAndClick(page, `/api/v1/exams/${demoExamId}/questions`, /Next/i);
        await waitForApiAndClick(page, `/api/v1/exams/${demoExamId}/settings`, /Next/i);
        await waitForApiAndClick(page, `/api/v1/exams/${demoExamId}/scheduling`, /Next/i);

        const publishResponsePromise = page.waitForResponse((response) =>
            response.url().includes(`/api/v1/exams/${demoExamId}/publish`) && response.request().method() === 'POST',
        );
        await page.getByRole('button', { name: /Publish Exam/i }).click();
        const publishResponse = await publishResponsePromise;
        expect(publishResponse.status(), await publishResponse.text()).toBe(200);
        await expect(page.getByText(/Exam published successfully/i).first()).toBeVisible();
        await page.screenshot({ path: path.join(ARTIFACT_DIR, '04-builder-published.png'), fullPage: true });
    });

    test('student can start and submit the demo exam', async ({ page }) => {
        test.skip(!demoExamId, 'Demo exam was not published.');
        await loginStudentUi(page);
        await page.goto(`/student/exam/${demoExamId}`);
        await expect(page.getByRole('button', { name: /Start Exam/i })).toBeVisible();

        const startResponsePromise = page.waitForResponse((response) =>
            response.url().includes(`/api/v1/exams/${demoExamId}/start`) && response.request().method() === 'POST',
        );
        await page.getByRole('button', { name: /Start Exam/i }).click();
        const startResponse = await startResponsePromise;
        expect(startResponse.status(), await startResponse.text()).toBe(201);
        await expect(page.getByText(/Question 1 of 3/i)).toBeVisible({ timeout: 20_000 });

        const optionA = page.getByRole('button', { name: /Option A/i }).first();
        await optionA.click();
        await expect(optionA).toHaveAttribute('aria-pressed', 'true');

        const submitResponsePromise = page.waitForResponse((response) =>
            response.url().includes(`/api/v1/exams/${demoExamId}/submit`) && response.request().method() === 'POST',
        );
        await page.getByRole('button', { name: /Submit Exam/i }).click();
        const confirmButton = page.getByRole('button', { name: /^Submit$/i });
        await confirmButton.waitFor({ state: 'visible', timeout: 5_000 }).then(
            () => confirmButton.click(),
            () => undefined,
        );
        const submitResponse = await submitResponsePromise;
        expect(submitResponse.status(), await submitResponse.text()).toBe(200);
// eslint-disable-next-line security/detect-non-literal-regexp
        await expect(page).toHaveURL(new RegExp(`/student/exam/${demoExamId}/result`));
        await expect(page.getByText(/Exam Results|Results Pending|Total Score/i).first()).toBeVisible({ timeout: 20_000 });
        await expect(page.getByText(/Error Loading Results/i)).toHaveCount(0);
        await page.screenshot({ path: path.join(ARTIFACT_DIR, '05-student-result.png'), fullPage: true });
    });
});

async function writeQuestionImportWorkbook(
    runId: string,
    names: { group: string; subGroup: string; subject: string; chapter: string; topic: string },
): Promise<string> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Questions');
    sheet.addRow([
        'questionType',
        'questionText',
        'option1',
        'option2',
        'option3',
        'option4',
        'correctOption',
        'difficulty',
        'marks',
        'negativeMarks',
        'group',
        'subGroup',
        'subject',
        'chapter',
        'topic',
        'tags',
        'explanation',
        'year',
        'source',
    ]);

    for (const [idx, difficulty] of ['easy', 'medium', 'hard'].entries()) {
        sheet.addRow([
            'mcq',
            `EC Deep Q ${runId} ${idx + 1}`,
            'Option A',
            'Option B',
            'Option C',
            'Option D',
            '1',
            difficulty,
            '1',
            '0',
            names.group,
            names.subGroup,
            names.subject,
            names.chapter,
            names.topic,
            `exam-center,${runId}`,
            `Explanation ${idx + 1}`,
            '2026',
            'Playwright',
        ]);
    }

    const filePath = path.join(ARTIFACT_DIR, `question-import-${runId}.xlsx`);
    await workbook.xlsx.writeFile(filePath);
    return filePath;
}

async function loginAdminUi(page: Page): Promise<void> {
    await page.goto('/__cw_admin__/login');
    await page.locator('input#identifier, input[name="identifier"], input[type="text"], input[type="email"]').first().fill(ADMIN.email);
    await page.locator('input#password, input[name="password"], input[type="password"]').first().fill(ADMIN.password);
    await page.getByRole('button', { name: /Sign In/i }).click();
    await expect(page).toHaveURL(/\/__cw_admin__\/dashboard/, { timeout: 20_000 });
}

async function loginStudentUi(page: Page): Promise<void> {
    await page.context().clearCookies();
    await page.goto('/login');
    await page.evaluate(() => localStorage.clear()).catch(() => undefined);
    await page.locator('input#identifier, input[name="identifier"], input[type="text"], input[type="email"]').first().fill(STUDENT.email);
    await page.locator('input#password, input[name="password"], input[type="password"]').first().fill(STUDENT.password);
    await page.getByRole('button', { name: /(Sign in|Access Dashboard)/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 });
}

async function exportQuestionBankFromUi(page: Page): Promise<string> {
    const exportButton = page.getByRole('button', { name: /^Export$/i }).first();
    await exportButton.hover();
    const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.getByRole('button', { name: /Excel/i }).click(),
    ]);
    const exportPath = path.join(ARTIFACT_DIR, download.suggestedFilename());
    await download.saveAs(exportPath);
    return exportPath;
}

async function getImportedQuestionIds(request: APIRequestContext, runId: string): Promise<string[]> {
    const response = await request.get(`/api/v1/questions?search=${encodeURIComponent(`EC Deep Q ${runId}`)}&limit=10`);
    expect(response.status(), await response.text()).toBe(200);
    const body = await response.json();
    const rows = Array.isArray(body.data) ? body.data : [];
    return rows.map((row: { _id?: string }) => String(row._id || '')).filter(Boolean);
}

function findHierarchyChain(groups: HierarchyNode[], names: {
    group: string;
    subGroup: string;
    subject: string;
    chapter: string;
    topic: string;
}) {
    const byName = (items: HierarchyNode[] | undefined, name: string) =>
        (items || []).find((item) => item.title?.en === name || item.title?.bn === name || item.code === name);
    const group = byName(groups, names.group);
    const subGroup = byName(group?.children, names.subGroup);
    const subject = byName(subGroup?.children, names.subject);
    const chapter = byName(subject?.children, names.chapter);
    const topic = byName(chapter?.children, names.topic);
    return { group, subGroup, subject, chapter, topic };
}

async function waitForApiAndClick(page: Page, urlPart: string, buttonName: RegExp): Promise<void> {
    const responsePromise = page.waitForResponse((response) =>
        response.url().includes(urlPart) && ['PUT', 'POST'].includes(response.request().method()),
    );
    await page.getByRole('button', { name: buttonName }).click();
    const response = await responsePromise;
    expect(response.status(), await response.text()).toBe(200);
}

function attachHealthTracker(page: Page) {
    const pageErrors: string[] = [];
    const serverErrors: string[] = [];
    const onPageError = (error: Error) => pageErrors.push(error.message);
    const onResponse = (response: { url(): string; status(): number }) => {
        if (response.url().includes('/api/') && response.status() >= 500) {
            serverErrors.push(`${response.status()} ${response.url()}`);
        }
    };
    page.on('pageerror', onPageError);
    page.on('response', onResponse);
    return {
        pageErrors,
        serverErrors,
        detach: () => {
            page.off('pageerror', onPageError);
            page.off('response', onResponse);
        },
    };
}

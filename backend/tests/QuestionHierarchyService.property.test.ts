/**
 * Property 1: Hierarchy CRUD Round-Trip
 *
 * Feature: exam-management-system
 *
 * **Validates: Requirements 1.1, 1.2**
 *
 * For any valid group data (bilingual title, code, description, icon, color,
 * sortOrder, isActive), calling createGroup then reading the created group
 * back from the database SHALL return a document with all fields matching
 * the input data.
 */
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import fc from 'fast-check';
import {
    createGroup,
    CreateGroupDto,
    createSubGroup,
    createSubject,
    createChapter,
    createTopic,
    deleteGroup,
    deleteSubGroup,
    deleteSubject,
    deleteChapter,
    getFullTree,
    mergeNodes,
} from '../src/services/QuestionHierarchyService';
import QuestionGroup from '../src/models/QuestionGroup';
import QuestionSubGroup from '../src/models/QuestionSubGroup';
import QuestionCategory from '../src/models/QuestionCategory';
import QuestionChapter from '../src/models/QuestionChapter';
import QuestionTopic from '../src/models/QuestionTopic';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create({
        instance: { launchTimeout: 60000 },
    });
    await mongoose.connect(mongoServer.getUri());
}, 120000);

afterEach(async () => {
    await Promise.all([
        QuestionGroup.deleteMany({}),
        QuestionSubGroup.deleteMany({}),
        QuestionCategory.deleteMany({}),
        QuestionChapter.deleteMany({}),
        QuestionTopic.deleteMany({}),
    ]);
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

// ─── Arbitrary Generators ────────────────────────────────────────────────────

/**
 * Generate a valid slug/code that matches the QuestionGroup schema regex:
 * ^[a-z0-9][a-z0-9-_]*$
 * We append a counter to ensure uniqueness across runs.
 */
let slugCounter = 0;
const SLUG_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';
const arbSlug: fc.Arbitrary<string> = fc
    .array(fc.constantFrom(...SLUG_CHARS.split('')), { minLength: 2, maxLength: 15 })
    .map((chars: string[]) => `${chars.join('')}-${++slugCounter}`);

/** Non-empty trimmed string for bilingual title fields */
const arbNonEmptyStr = fc
    .string({ minLength: 1, maxLength: 60 })
    .filter((s) => s.trim().length > 0)
    .map((s) => s.trim());

/** Arbitrary bilingual name */
const arbBilingualName = fc.record({
    en: arbNonEmptyStr,
    bn: arbNonEmptyStr,
});

/** Arbitrary optional bilingual description */
const arbDescription = fc.option(
    fc.record({
        en: fc.string({ minLength: 0, maxLength: 100 }),
        bn: fc.string({ minLength: 0, maxLength: 100 }),
    }),
    { nil: undefined },
);

/** Arbitrary optional icon URL */
const arbIcon = fc.option(fc.string({ minLength: 0, maxLength: 80 }), { nil: undefined });

/** Arbitrary optional color */
const arbColor = fc.option(fc.string({ minLength: 0, maxLength: 20 }), { nil: undefined });

/** Arbitrary sortOrder */
const arbSortOrder = fc.option(fc.integer({ min: 0, max: 1000 }), { nil: undefined });

/** Arbitrary isActive flag */
const arbIsActive = fc.option(fc.boolean(), { nil: undefined });

/** Full CreateGroupDto arbitrary */
const arbCreateGroupDto = fc.record({
    name: arbBilingualName,
    slug: arbSlug,
    description: arbDescription,
    icon: arbIcon,
    color: arbColor,
    sortOrder: arbSortOrder,
    isActive: arbIsActive,
});

// ─── Property Test ───────────────────────────────────────────────────────────

describe('Property 1: Hierarchy CRUD Round-Trip', () => {
    it('createGroup then read back — all fields match input data', async () => {
        await fc.assert(
            fc.asyncProperty(arbCreateGroupDto, async (dto: CreateGroupDto) => {
                // Clean slate for each iteration
                await QuestionGroup.deleteMany({});

                // Create the group via the service
                const created = await createGroup(dto);

                // Read it back directly from the database
                const readBack = await QuestionGroup.findById(created._id).lean();
                expect(readBack).not.toBeNull();

                // Title round-trip
                expect(readBack!.title.en).toBe(dto.name.en);
                expect(readBack!.title.bn).toBe(dto.name.bn);

                // Code/slug round-trip
                const expectedCode = dto.slug!.toLowerCase();
                expect(readBack!.code).toBe(expectedCode);

                // Description round-trip (Mongoose LocalizedText has trim: true)
                if (dto.description) {
                    const expectedDescEn = (dto.description.en || '').trim();
                    const expectedDescBn = (dto.description.bn || '').trim();
                    expect(readBack!.description?.en).toBe(expectedDescEn);
                    expect(readBack!.description?.bn).toBe(expectedDescBn);
                }

                // Icon round-trip
                expect(readBack!.iconUrl).toBe(dto.icon || '');

                // Color round-trip
                expect(readBack!.color).toBe(dto.color || '');

                // SortOrder round-trip
                expect(readBack!.order).toBe(dto.sortOrder ?? 0);

                // isActive round-trip
                expect(readBack!.isActive).toBe(dto.isActive ?? true);
            }),
            { numRuns: 50 },
        );
    });
});

// ─── Property 2: Parent Chain Validity ───────────────────────────────────────
/**
 * Property 2: Parent Chain Validity
 *
 * Feature: exam-management-system
 *
 * **Validates: Requirements 1.3, 1.4, 1.5, 1.6**
 *
 * For any valid hierarchy chain (Group → SubGroup → Subject → Chapter → Topic),
 * traversing parent references from the leaf Topic back up to the root Group
 * SHALL form an unbroken chain where each parent exists and references are valid.
 */

// ─── Generators for Parent Chain Test ────────────────────────────────────────

let chainSlugCounter = 0;
const CHAIN_SLUG_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';
const arbChainSlug: fc.Arbitrary<string> = fc
    .array(fc.constantFrom(...CHAIN_SLUG_CHARS.split('')), { minLength: 2, maxLength: 10 })
    .map((chars: string[]) => `${chars.join('')}-c${++chainSlugCounter}`);

const arbChainTitle = fc.record({
    en: fc
        .string({ minLength: 1, maxLength: 40 })
        .filter((s) => s.trim().length > 0)
        .map((s) => s.trim()),
    bn: fc
        .string({ minLength: 1, maxLength: 40 })
        .filter((s) => s.trim().length > 0)
        .map((s) => s.trim()),
});

describe('Property 2: Parent Chain Validity', () => {
    it('traversing parent refs from Topic to Group forms an unbroken chain', async () => {
        await fc.assert(
            fc.asyncProperty(
                arbChainSlug,
                arbChainTitle,
                arbChainSlug,
                arbChainTitle,
                arbChainSlug,
                arbChainTitle,
                arbChainSlug,
                arbChainTitle,
                arbChainSlug,
                arbChainTitle,
                async (
                    groupSlug,
                    groupTitle,
                    subGroupCode,
                    subGroupTitle,
                    subjectCode,
                    subjectTitle,
                    chapterCode,
                    chapterTitle,
                    topicCode,
                    topicTitle,
                ) => {
                    // Clean slate
                    await Promise.all([
                        QuestionGroup.deleteMany({}),
                        QuestionSubGroup.deleteMany({}),
                        QuestionCategory.deleteMany({}),
                        QuestionChapter.deleteMany({}),
                        QuestionTopic.deleteMany({}),
                    ]);

                    // Level 1: Create Group
                    const group = await createGroup({
                        name: groupTitle,
                        slug: groupSlug,
                    });

                    // Level 2: Create SubGroup under Group
                    const subGroup = await createSubGroup({
                        group_id: group._id.toString(),
                        code: subGroupCode,
                        title: subGroupTitle,
                    });

                    // Level 3: Create Subject under SubGroup
                    const subject = await createSubject({
                        sub_group_id: subGroup._id.toString(),
                        code: subjectCode,
                        title: subjectTitle,
                    });

                    // Level 4: Create Chapter under Subject
                    const chapter = await createChapter({
                        subject_id: subject._id.toString(),
                        group_id: group._id.toString(),
                        code: chapterCode,
                        title: chapterTitle,
                    });

                    // Level 5: Create Topic under Chapter
                    const topic = await createTopic({
                        chapter_id: chapter._id.toString(),
                        code: topicCode,
                        title: topicTitle,
                    });

                    // ── Traverse the chain from Topic back to Group ──

                    // Step 1: Topic → Chapter (via parent_id)
                    const topicDoc = await QuestionTopic.findById(topic._id).lean();
                    expect(topicDoc).not.toBeNull();
                    expect(topicDoc!.parent_id).not.toBeNull();

                    const chapterDoc = await QuestionChapter.findById(topicDoc!.parent_id).lean();
                    expect(chapterDoc).not.toBeNull();
                    expect(chapterDoc!._id.toString()).toBe(chapter._id.toString());

                    // Step 2: Chapter → Subject (via subject_id)
                    expect(chapterDoc!.subject_id).toBeDefined();
                    const subjectDoc = await QuestionCategory.findById(chapterDoc!.subject_id).lean();
                    expect(subjectDoc).not.toBeNull();
                    expect(subjectDoc!._id.toString()).toBe(subject._id.toString());

                    // Step 3: Subject → SubGroup (via parent_id)
                    expect(subjectDoc!.parent_id).not.toBeNull();
                    const subGroupDoc = await QuestionSubGroup.findById(subjectDoc!.parent_id).lean();
                    expect(subGroupDoc).not.toBeNull();
                    expect(subGroupDoc!._id.toString()).toBe(subGroup._id.toString());

                    // Step 4: SubGroup → Group (via group_id)
                    expect(subGroupDoc!.group_id).toBeDefined();
                    const groupDoc = await QuestionGroup.findById(subGroupDoc!.group_id).lean();
                    expect(groupDoc).not.toBeNull();
                    expect(groupDoc!._id.toString()).toBe(group._id.toString());

                    // Verify denormalized group_id references are consistent
                    expect(topicDoc!.group_id.toString()).toBe(group._id.toString());
                    expect(chapterDoc!.group_id.toString()).toBe(group._id.toString());
                    expect(subjectDoc!.group_id.toString()).toBe(group._id.toString());
                },
            ),
            { numRuns: 20 },
        );
    });
});


// ─── Property 3: Delete Rejection for Non-Leaf Nodes ─────────────────────────
/**
 * Property 3: Delete Rejection for Non-Leaf Nodes
 *
 * Feature: exam-management-system
 *
 * **Validates: Requirements 1.9**
 *
 * WHEN an admin deletes a node that has child nodes,
 * THE Question_Hierarchy_Service SHALL reject the deletion
 * and return an error indicating dependent children exist.
 * The parent node SHALL still exist in the database after the rejected deletion.
 */

describe('Property 3: Delete Rejection for Non-Leaf Nodes', () => {
    it('deleteGroup is rejected when Group has SubGroup children', async () => {
        await fc.assert(
            fc.asyncProperty(
                arbChainSlug,
                arbChainTitle,
                arbChainSlug,
                arbChainTitle,
                async (groupSlug, groupTitle, subGroupCode, subGroupTitle) => {
                    await Promise.all([
                        QuestionGroup.deleteMany({}),
                        QuestionSubGroup.deleteMany({}),
                    ]);

                    const group = await createGroup({ name: groupTitle, slug: groupSlug });
                    await createSubGroup({
                        group_id: group._id.toString(),
                        code: subGroupCode,
                        title: subGroupTitle,
                    });

                    await expect(deleteGroup(group._id.toString())).rejects.toThrow();

                    const stillExists = await QuestionGroup.findById(group._id).lean();
                    expect(stillExists).not.toBeNull();
                },
            ),
            { numRuns: 20 },
        );
    });

    it('deleteSubGroup is rejected when SubGroup has Subject children', async () => {
        await fc.assert(
            fc.asyncProperty(
                arbChainSlug,
                arbChainTitle,
                arbChainSlug,
                arbChainTitle,
                arbChainSlug,
                arbChainTitle,
                async (groupSlug, groupTitle, sgCode, sgTitle, subjCode, subjTitle) => {
                    await Promise.all([
                        QuestionGroup.deleteMany({}),
                        QuestionSubGroup.deleteMany({}),
                        QuestionCategory.deleteMany({}),
                    ]);

                    const group = await createGroup({ name: groupTitle, slug: groupSlug });
                    const subGroup = await createSubGroup({
                        group_id: group._id.toString(),
                        code: sgCode,
                        title: sgTitle,
                    });
                    await createSubject({
                        sub_group_id: subGroup._id.toString(),
                        code: subjCode,
                        title: subjTitle,
                    });

                    await expect(deleteSubGroup(subGroup._id.toString())).rejects.toThrow();

                    const stillExists = await QuestionSubGroup.findById(subGroup._id).lean();
                    expect(stillExists).not.toBeNull();
                },
            ),
            { numRuns: 20 },
        );
    });

    it('deleteSubject is rejected when Subject has Chapter children', async () => {
        await fc.assert(
            fc.asyncProperty(
                arbChainSlug,
                arbChainTitle,
                arbChainSlug,
                arbChainTitle,
                arbChainSlug,
                arbChainTitle,
                arbChainSlug,
                arbChainTitle,
                async (
                    groupSlug, groupTitle,
                    sgCode, sgTitle,
                    subjCode, subjTitle,
                    chapCode, chapTitle,
                ) => {
                    await Promise.all([
                        QuestionGroup.deleteMany({}),
                        QuestionSubGroup.deleteMany({}),
                        QuestionCategory.deleteMany({}),
                        QuestionChapter.deleteMany({}),
                    ]);

                    const group = await createGroup({ name: groupTitle, slug: groupSlug });
                    const subGroup = await createSubGroup({
                        group_id: group._id.toString(),
                        code: sgCode,
                        title: sgTitle,
                    });
                    const subject = await createSubject({
                        sub_group_id: subGroup._id.toString(),
                        code: subjCode,
                        title: subjTitle,
                    });
                    await createChapter({
                        subject_id: subject._id.toString(),
                        group_id: group._id.toString(),
                        code: chapCode,
                        title: chapTitle,
                    });

                    await expect(deleteSubject(subject._id.toString())).rejects.toThrow();

                    const stillExists = await QuestionCategory.findById(subject._id).lean();
                    expect(stillExists).not.toBeNull();
                },
            ),
            { numRuns: 20 },
        );
    });

    it('deleteChapter is rejected when Chapter has Topic children', async () => {
        await fc.assert(
            fc.asyncProperty(
                arbChainSlug,
                arbChainTitle,
                arbChainSlug,
                arbChainTitle,
                arbChainSlug,
                arbChainTitle,
                arbChainSlug,
                arbChainTitle,
                arbChainSlug,
                arbChainTitle,
                async (
                    groupSlug, groupTitle,
                    sgCode, sgTitle,
                    subjCode, subjTitle,
                    chapCode, chapTitle,
                    topicCode, topicTitle,
                ) => {
                    await Promise.all([
                        QuestionGroup.deleteMany({}),
                        QuestionSubGroup.deleteMany({}),
                        QuestionCategory.deleteMany({}),
                        QuestionChapter.deleteMany({}),
                        QuestionTopic.deleteMany({}),
                    ]);

                    const group = await createGroup({ name: groupTitle, slug: groupSlug });
                    const subGroup = await createSubGroup({
                        group_id: group._id.toString(),
                        code: sgCode,
                        title: sgTitle,
                    });
                    const subject = await createSubject({
                        sub_group_id: subGroup._id.toString(),
                        code: subjCode,
                        title: subjTitle,
                    });
                    const chapter = await createChapter({
                        subject_id: subject._id.toString(),
                        group_id: group._id.toString(),
                        code: chapCode,
                        title: chapTitle,
                    });
                    await createTopic({
                        chapter_id: chapter._id.toString(),
                        code: topicCode,
                        title: topicTitle,
                    });

                    await expect(deleteChapter(chapter._id.toString())).rejects.toThrow();

                    const stillExists = await QuestionChapter.findById(chapter._id).lean();
                    expect(stillExists).not.toBeNull();
                },
            ),
            { numRuns: 20 },
        );
    });
});


// ─── Property 4: Tree Completeness and Sort Order ────────────────────────────
/**
 * Property 4: Tree Completeness and Sort Order
 *
 * Feature: exam-management-system
 *
 * **Validates: Requirements 1.10**
 *
 * WHEN an admin requests the hierarchy tree, THE Question_Hierarchy_Service
 * SHALL return all groups with nested sub-groups, subjects, chapters, and
 * topics in a single response sorted by sortOrder. The tree must contain
 * every active node that was created, and nodes at each level must be
 * sorted by their order field.
 */

describe('Property 4: Tree Completeness and Sort Order', () => {
    it('getFullTree contains every active node sorted by order', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Random sort orders for each node (2 groups, 2 sub-groups, 2 subjects, 2 chapters, 2 topics)
                fc.integer({ min: 0, max: 1000 }), // group1 order
                fc.integer({ min: 0, max: 1000 }), // group2 order
                fc.integer({ min: 0, max: 1000 }), // sg1 order
                fc.integer({ min: 0, max: 1000 }), // sg2 order
                fc.integer({ min: 0, max: 1000 }), // subj1 order
                fc.integer({ min: 0, max: 1000 }), // subj2 order
                fc.integer({ min: 0, max: 1000 }), // ch1 order
                fc.integer({ min: 0, max: 1000 }), // ch2 order
                fc.integer({ min: 0, max: 1000 }), // topic1 order
                fc.integer({ min: 0, max: 1000 }), // topic2 order
                async (
                    g1Order, g2Order,
                    sg1Order, sg2Order,
                    subj1Order, subj2Order,
                    ch1Order, ch2Order,
                    t1Order, t2Order,
                ) => {
                    // Clean slate
                    await Promise.all([
                        QuestionGroup.deleteMany({}),
                        QuestionSubGroup.deleteMany({}),
                        QuestionCategory.deleteMany({}),
                        QuestionChapter.deleteMany({}),
                        QuestionTopic.deleteMany({}),
                    ]);

                    // Create 2 groups with random sort orders
                    const group1 = await createGroup({ name: { en: 'Group A', bn: 'গ্রুপ ক' }, slug: 'group-a', sortOrder: g1Order });
                    const group2 = await createGroup({ name: { en: 'Group B', bn: 'গ্রুপ খ' }, slug: 'group-b', sortOrder: g2Order });

                    // Create 2 sub-groups under group1
                    const sg1 = await createSubGroup({ group_id: group1._id.toString(), code: 'sg-a', title: { en: 'SG A', bn: 'এসজি ক' }, order: sg1Order });
                    const sg2 = await createSubGroup({ group_id: group1._id.toString(), code: 'sg-b', title: { en: 'SG B', bn: 'এসজি খ' }, order: sg2Order });

                    // Create 2 subjects under sg1
                    const subj1 = await createSubject({ sub_group_id: sg1._id.toString(), code: 'subj-a', title: { en: 'Subject A', bn: 'বিষয় ক' }, order: subj1Order });
                    const subj2 = await createSubject({ sub_group_id: sg1._id.toString(), code: 'subj-b', title: { en: 'Subject B', bn: 'বিষয় খ' }, order: subj2Order });

                    // Create 2 chapters under subj1
                    const ch1 = await createChapter({ subject_id: subj1._id.toString(), group_id: group1._id.toString(), code: 'ch-a', title: { en: 'Chapter A', bn: 'অধ্যায় ক' }, order: ch1Order });
                    const ch2 = await createChapter({ subject_id: subj1._id.toString(), group_id: group1._id.toString(), code: 'ch-b', title: { en: 'Chapter B', bn: 'অধ্যায় খ' }, order: ch2Order });

                    // Create 2 topics under ch1
                    const topic1 = await createTopic({ chapter_id: ch1._id.toString(), code: 'topic-a', title: { en: 'Topic A', bn: 'টপিক ক' }, order: t1Order });
                    const topic2 = await createTopic({ chapter_id: ch1._id.toString(), code: 'topic-b', title: { en: 'Topic B', bn: 'টপিক খ' }, order: t2Order });

                    // Get the full tree
                    const tree = await getFullTree();

                    // ── Completeness: tree contains ALL created nodes ──

                    // All group IDs present
                    const treeGroupIds = tree.map((g: any) => g._id.toString());
                    expect(treeGroupIds).toContain(group1._id.toString());
                    expect(treeGroupIds).toContain(group2._id.toString());

                    // Find group1 in tree
                    const treeGroup1 = tree.find((g: any) => g._id.toString() === group1._id.toString());
                    expect(treeGroup1).toBeDefined();
                    const g1: any = treeGroup1!;

                    // All sub-group IDs present under group1
                    const treeSgIds = g1.children.map((sg: any) => sg._id.toString());
                    expect(treeSgIds).toContain(sg1._id.toString());
                    expect(treeSgIds).toContain(sg2._id.toString());

                    // Find sg1 in tree
                    const treeSg1 = g1.children.find((sg: any) => sg._id.toString() === sg1._id.toString());
                    expect(treeSg1).toBeDefined();
                    const s1 = treeSg1!;

                    // All subject IDs present under sg1
                    const treeSubjIds = s1.children.map((s: any) => s._id.toString());
                    expect(treeSubjIds).toContain(subj1._id.toString());
                    expect(treeSubjIds).toContain(subj2._id.toString());

                    // Find subj1 in tree
                    const treeSubj1 = s1.children.find((s: any) => s._id.toString() === subj1._id.toString());
                    expect(treeSubj1).toBeDefined();
                    const sj1 = treeSubj1!;

                    // All chapter IDs present under subj1
                    const treeChIds = sj1.children.map((c: any) => c._id.toString());
                    expect(treeChIds).toContain(ch1._id.toString());
                    expect(treeChIds).toContain(ch2._id.toString());

                    // Find ch1 in tree
                    const treeCh1 = sj1.children.find((c: any) => c._id.toString() === ch1._id.toString());
                    expect(treeCh1).toBeDefined();
                    const c1 = treeCh1!;

                    // All topic IDs present under ch1
                    const treeTopicIds = c1.children.map((t: any) => t._id.toString());
                    expect(treeTopicIds).toContain(topic1._id.toString());
                    expect(treeTopicIds).toContain(topic2._id.toString());

                    // ── Sort Order: nodes at each level sorted by order ──

                    // Groups sorted by order
                    const groupOrders = tree.map((g: any) => g.order);
                    for (let i = 1; i < groupOrders.length; i++) {
                        expect(groupOrders[i]).toBeGreaterThanOrEqual(groupOrders[i - 1]);
                    }

                    // Sub-groups under group1 sorted by order
                    const sgOrders = g1.children.map((sg: any) => sg.order);
                    for (let i = 1; i < sgOrders.length; i++) {
                        expect(sgOrders[i]).toBeGreaterThanOrEqual(sgOrders[i - 1]);
                    }

                    // Subjects under sg1 sorted by order
                    const subjOrders = s1.children.map((s: any) => s.order);
                    for (let i = 1; i < subjOrders.length; i++) {
                        expect(subjOrders[i]).toBeGreaterThanOrEqual(subjOrders[i - 1]);
                    }

                    // Chapters under subj1 sorted by order
                    const chOrders = sj1.children.map((c: any) => c.order);
                    for (let i = 1; i < chOrders.length; i++) {
                        expect(chOrders[i]).toBeGreaterThanOrEqual(chOrders[i - 1]);
                    }

                    // Topics under ch1 sorted by order
                    const topicOrders = c1.children.map((t: any) => t.order);
                    for (let i = 1; i < topicOrders.length; i++) {
                        expect(topicOrders[i]).toBeGreaterThanOrEqual(topicOrders[i - 1]);
                    }
                },
            ),
            { numRuns: 20 },
        );
    });
});


// ─── Property 5: Duplicate Name Rejection ────────────────────────────────────
/**
 * Property 5: Duplicate Name Rejection
 *
 * Feature: exam-management-system
 *
 * **Validates: Requirements 1.11**
 *
 * For any two hierarchy nodes at the same level under the same parent,
 * if they have the same name (en or bn), the second creation attempt
 * SHALL be rejected with a duplicate name error.
 */

describe('Property 5: Duplicate Name Rejection', () => {
    it('creating two Groups with the same title is rejected', async () => {
        await fc.assert(
            fc.asyncProperty(
                arbChainSlug,
                arbChainTitle,
                arbChainSlug,
                async (slug1, sharedTitle, slug2) => {
                    await QuestionGroup.deleteMany({});

                    // First creation succeeds
                    await createGroup({ name: sharedTitle, slug: slug1 });

                    // Second creation with same title is rejected
                    await expect(
                        createGroup({ name: sharedTitle, slug: slug2 }),
                    ).rejects.toThrow(/already exists/i);
                },
            ),
            { numRuns: 20 },
        );
    });

    it('creating two SubGroups with the same title under the same parent Group is rejected', async () => {
        await fc.assert(
            fc.asyncProperty(
                arbChainSlug,
                arbChainTitle,
                arbChainSlug,
                arbChainTitle,
                arbChainSlug,
                async (groupSlug, groupTitle, sgCode1, sharedSgTitle, sgCode2) => {
                    await Promise.all([
                        QuestionGroup.deleteMany({}),
                        QuestionSubGroup.deleteMany({}),
                    ]);

                    const group = await createGroup({ name: groupTitle, slug: groupSlug });

                    // First sub-group creation succeeds
                    await createSubGroup({
                        group_id: group._id.toString(),
                        code: sgCode1,
                        title: sharedSgTitle,
                    });

                    // Second sub-group with same title under same parent is rejected
                    await expect(
                        createSubGroup({
                            group_id: group._id.toString(),
                            code: sgCode2,
                            title: sharedSgTitle,
                        }),
                    ).rejects.toThrow(/already exists/i);
                },
            ),
            { numRuns: 20 },
        );
    });
});


// ─── Property 6: Merge Reassigns All Children and Questions ──────────────────
/**
 * Property 6: Merge Reassigns All Children and Questions
 *
 * Feature: exam-management-system
 *
 * **Validates: Requirements 1.13**
 *
 * WHEN an admin merges two Groups (source into target),
 * THE Question_Hierarchy_Service SHALL reassign all SubGroup children
 * from the source Group to the target Group, and then delete the source Group.
 * After the merge:
 *   - The source Group no longer exists in the database
 *   - All SubGroups that were under the source now reference the target's group_id
 */

describe('Property 6: Merge Reassigns All Children and Questions', () => {
    it('mergeNodes at group level reassigns SubGroup children to target and deletes source', async () => {
        await fc.assert(
            fc.asyncProperty(
                arbChainSlug,
                arbChainTitle,
                arbChainSlug,
                arbChainTitle,
                fc.integer({ min: 1, max: 3 }),
                async (sourceSlug, sourceTitle, targetSlug, targetTitle, numChildren) => {
                    // Clean slate
                    await Promise.all([
                        QuestionGroup.deleteMany({}),
                        QuestionSubGroup.deleteMany({}),
                    ]);

                    // Create source and target groups
                    const sourceGroup = await createGroup({ name: sourceTitle, slug: sourceSlug });
                    const targetGroup = await createGroup({ name: targetTitle, slug: targetSlug });

                    // Create SubGroup children under the source group
                    const childIds: string[] = [];
                    for (let i = 0; i < numChildren; i++) {
                        const child = await createSubGroup({
                            group_id: sourceGroup._id.toString(),
                            code: `child-${sourceSlug}-${i}`,
                            title: { en: `Child EN ${i} ${sourceSlug}`, bn: `Child BN ${i} ${sourceSlug}` },
                        });
                        childIds.push(child._id.toString());
                    }

                    // Verify children belong to source before merge
                    const beforeMerge = await QuestionSubGroup.find({ group_id: sourceGroup._id }).lean();
                    expect(beforeMerge).toHaveLength(numChildren);

                    // Perform merge: source → target
                    await mergeNodes('group', sourceGroup._id.toString(), targetGroup._id.toString());

                    // Assert: source Group no longer exists
                    const sourceAfter = await QuestionGroup.findById(sourceGroup._id).lean();
                    expect(sourceAfter).toBeNull();

                    // Assert: target Group still exists
                    const targetAfter = await QuestionGroup.findById(targetGroup._id).lean();
                    expect(targetAfter).not.toBeNull();

                    // Assert: all SubGroups now reference target's group_id
                    for (const childId of childIds) {
                        const child = await QuestionSubGroup.findById(childId).lean();
                        expect(child).not.toBeNull();
                        expect(child!.group_id.toString()).toBe(targetGroup._id.toString());
                    }

                    // Assert: no SubGroups reference the source anymore
                    const orphaned = await QuestionSubGroup.find({ group_id: sourceGroup._id }).lean();
                    expect(orphaned).toHaveLength(0);
                },
            ),
            { numRuns: 20 },
        );
    });
});

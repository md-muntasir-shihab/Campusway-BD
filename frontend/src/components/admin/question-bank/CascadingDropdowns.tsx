import { useMemo, useCallback } from 'react';
import { Loader2, ChevronDown } from 'lucide-react';
import { useHierarchyTree } from '../../../hooks/useExamSystemQueries';
import type { HierarchyNode } from '../../../types/exam-system';

// ─── Value shape ─────────────────────────────────────────────────────────

export interface CascadingDropdownsValue {
    group_id?: string;
    sub_group_id?: string;
    subject_id?: string;
    chapter_id?: string;
    topic_id?: string;
}

// ─── Props ───────────────────────────────────────────────────────────────

export interface CascadingDropdownsProps {
    value: CascadingDropdownsValue;
    onChange: (value: CascadingDropdownsValue) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────

/** Find a node by ID in a flat list. */
function findNode(nodes: HierarchyNode[] | undefined, id: string | undefined): HierarchyNode | undefined {
    if (!nodes || !id) return undefined;
    return nodes.find((n) => n._id === id);
}

/** Get display label for a hierarchy node (prefer English, fallback Bengali). */
function nodeLabel(node: HierarchyNode): string {
    return node.title.en || node.title.bn || node.code;
}

// ─── Single Dropdown ─────────────────────────────────────────────────────

interface DropdownProps {
    label: string;
    placeholder: string;
    options: HierarchyNode[];
    selectedId: string | undefined;
    onSelect: (id: string | undefined) => void;
    disabled: boolean;
    loading: boolean;
}

function Dropdown({ label, placeholder, options, selectedId, onSelect, disabled, loading }: DropdownProps) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                {label}
            </label>
            <div className="relative">
                <select
                    value={selectedId ?? ''}
                    onChange={(e) => onSelect(e.target.value || undefined)}
                    disabled={disabled || loading}
                    className={`
                        w-full appearance-none rounded-xl border px-3 py-2 pr-9 text-sm transition
                        bg-white dark:bg-slate-800
                        border-slate-200 dark:border-slate-700/60
                        text-slate-900 dark:text-white
                        placeholder:text-slate-400 dark:placeholder:text-slate-500
                        focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500
                        disabled:opacity-50 disabled:cursor-not-allowed
                    `}
                    aria-label={label}
                >
                    <option value="">{placeholder}</option>
                    {options.map((node) => (
                        <option key={node._id} value={node._id}>
                            {nodeLabel(node)}
                        </option>
                    ))}
                </select>

                {/* Icon overlay */}
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5">
                    {loading ? (
                        <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
                    ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── CascadingDropdowns ──────────────────────────────────────────────────

/**
 * 5-level cascading hierarchy selector: Group → Sub-Group → Subject → Chapter → Topic.
 *
 * Fetches the full hierarchy tree once via `useHierarchyTree()` and derives
 * each dropdown's options from the selected parent. Changing any upstream
 * dropdown clears all downstream selections.
 *
 * @requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7
 */
export default function CascadingDropdowns({ value, onChange }: CascadingDropdownsProps) {
    const { data: treeResponse, isLoading } = useHierarchyTree();

    // The tree data lives inside the API envelope: { success, data, message }
    const groups: HierarchyNode[] = useMemo(() => {
        if (!treeResponse) return [];
        // Handle both direct HierarchyTree and ApiResponse<HierarchyTree> shapes
        const tree = 'data' in treeResponse && treeResponse.data && typeof treeResponse.data === 'object' && 'groups' in treeResponse.data
            ? (treeResponse.data as { groups: HierarchyNode[] })
            : (treeResponse as unknown as { groups: HierarchyNode[] });
        return tree.groups ?? [];
    }, [treeResponse]);

    // Derive options for each level from the tree + current selections
    const subGroups = useMemo(() => {
        const group = findNode(groups, value.group_id);
        return group?.children ?? [];
    }, [groups, value.group_id]);

    const subjects = useMemo(() => {
        const subGroup = findNode(subGroups, value.sub_group_id);
        return subGroup?.children ?? [];
    }, [subGroups, value.sub_group_id]);

    const chapters = useMemo(() => {
        const subject = findNode(subjects, value.subject_id);
        return subject?.children ?? [];
    }, [subjects, value.subject_id]);

    const topics = useMemo(() => {
        const chapter = findNode(chapters, value.chapter_id);
        return chapter?.children ?? [];
    }, [chapters, value.chapter_id]);

    // ── Change handlers (clear downstream on upstream change) ────────────

    const handleGroupChange = useCallback(
        (id: string | undefined) => {
            onChange({
                group_id: id,
                sub_group_id: undefined,
                subject_id: undefined,
                chapter_id: undefined,
                topic_id: undefined,
            });
        },
        [onChange],
    );

    const handleSubGroupChange = useCallback(
        (id: string | undefined) => {
            onChange({
                ...value,
                sub_group_id: id,
                subject_id: undefined,
                chapter_id: undefined,
                topic_id: undefined,
            });
        },
        [onChange, value],
    );

    const handleSubjectChange = useCallback(
        (id: string | undefined) => {
            onChange({
                ...value,
                subject_id: id,
                chapter_id: undefined,
                topic_id: undefined,
            });
        },
        [onChange, value],
    );

    const handleChapterChange = useCallback(
        (id: string | undefined) => {
            onChange({
                ...value,
                chapter_id: id,
                topic_id: undefined,
            });
        },
        [onChange, value],
    );

    const handleTopicChange = useCallback(
        (id: string | undefined) => {
            onChange({
                ...value,
                topic_id: id,
            });
        },
        [onChange, value],
    );

    // ── Render ───────────────────────────────────────────────────────────

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Level 1 — Group */}
            <Dropdown
                label="Group"
                placeholder="Select Group…"
                options={groups}
                selectedId={value.group_id}
                onSelect={handleGroupChange}
                disabled={false}
                loading={isLoading}
            />

            {/* Level 2 — Sub-Group */}
            <Dropdown
                label="Sub-Group"
                placeholder="Select Sub-Group…"
                options={subGroups}
                selectedId={value.sub_group_id}
                onSelect={handleSubGroupChange}
                disabled={!value.group_id}
                loading={isLoading}
            />

            {/* Level 3 — Subject */}
            <Dropdown
                label="Subject"
                placeholder="Select Subject…"
                options={subjects}
                selectedId={value.subject_id}
                onSelect={handleSubjectChange}
                disabled={!value.sub_group_id}
                loading={isLoading}
            />

            {/* Level 4 — Chapter */}
            <Dropdown
                label="Chapter"
                placeholder="Select Chapter…"
                options={chapters}
                selectedId={value.chapter_id}
                onSelect={handleChapterChange}
                disabled={!value.subject_id}
                loading={isLoading}
            />

            {/* Level 5 — Topic */}
            <Dropdown
                label="Topic"
                placeholder="Select Topic…"
                options={topics}
                selectedId={value.topic_id}
                onSelect={handleTopicChange}
                disabled={!value.chapter_id}
                loading={isLoading}
            />
        </div>
    );
}

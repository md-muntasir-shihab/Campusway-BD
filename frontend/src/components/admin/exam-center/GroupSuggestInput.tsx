import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getStudentGroups } from '../../../api/adminStudentApi';
import { Search, X, Loader2 } from 'lucide-react';

interface GroupSuggestInputProps {
    value: string[]; // array of group IDs
    onChange: (groupIds: string[]) => void;
}

export default function GroupSuggestInput({ value, onChange }: GroupSuggestInputProps) {
    const [search, setSearch] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const { data, isLoading } = useQuery({
        queryKey: ['admin-student-groups', search],
        queryFn: () => getStudentGroups(search),
        staleTime: 60000,
    });

    const groups = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
    
    // Auto-fetch groups to resolve IDs to names
    const { data: allGroupsData } = useQuery({
        queryKey: ['admin-student-groups', ''],
        queryFn: () => getStudentGroups(''),
        staleTime: 60000,
    });
    
    const allGroups = Array.isArray(allGroupsData?.data) ? allGroupsData.data : Array.isArray(allGroupsData) ? allGroupsData : [];
    const idToNameMap = new Map(allGroups.map((g: any) => [g._id, g.title?.en || g.title?.bn || g.code || g._id]));

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleGroup = (id: string) => {
        if (value.includes(id)) {
            onChange(value.filter(v => v !== id));
        } else {
            onChange([...value, id]);
        }
    };

    return (
        <div className="relative" ref={wrapperRef}>
            <div className="mb-2 flex flex-wrap gap-2">
                {value.length === 0 && <span className="text-xs text-slate-400">No groups assigned.</span>}
                {value.map(id => (
                    <span key={id} className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400">
                        {String(idToNameMap.get(id) || id)}
                        <button type="button" aria-label="Remove group" title="Remove group" onClick={() => toggleGroup(id)} className="rounded-full hover:bg-indigo-200 dark:hover:bg-indigo-500/20">
                            <X size={12} />
                        </button>
                    </span>
                ))}
            </div>
            <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    placeholder="Search groups to add..."
                    className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:focus:border-indigo-400"
                />
            </div>
            
            {isOpen && (
                <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                    {isLoading ? (
                        <div className="flex items-center justify-center p-4"><Loader2 size={16} className="animate-spin text-indigo-500" /></div>
                    ) : groups.length === 0 ? (
                        <div className="p-4 text-center text-sm text-slate-500">No groups found.</div>
                    ) : (
                        <ul>
                            {groups.map((group: any) => {
                                const isSelected = value.includes(group._id);
                                return (
                                    <li
                                        key={group._id}
                                        onClick={() => toggleGroup(group._id)}
                                        className={`cursor-pointer px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 ${isSelected ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-200'}`}
                                    >
                                        <div className="font-medium">{group.title?.en || group.code}</div>
                                        {group.description?.en && <div className="text-xs text-slate-400">{group.description.en}</div>}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}

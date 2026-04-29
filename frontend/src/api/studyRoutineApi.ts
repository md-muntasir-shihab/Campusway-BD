import api from '../services/api';
import type {
    ApiResponse,
    StudyRoutine,
    StudyRoutineDto,
} from '../types/exam-system';

const BASE = '/v1/study-routine';

/** GET / — Get the student's study routine. */
export const getRoutine = () =>
    api.get<ApiResponse<StudyRoutine>>(`${BASE}`).then((r) => r.data);

/** PUT / — Update the student's study routine. */
export const updateRoutine = (payload: StudyRoutineDto) =>
    api.put<ApiResponse<StudyRoutine>>(`${BASE}`, payload).then((r) => r.data);

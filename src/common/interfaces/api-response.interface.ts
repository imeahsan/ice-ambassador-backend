// src/common/interfaces/api-response.interface.ts
export interface ApiResponse<T> {
    success: boolean;
    data: T | null;
    error: {
        message: string;
        code?: string;
        details?: any;
    } | null;
    timestamp: string;
}
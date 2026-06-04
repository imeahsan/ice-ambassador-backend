// src/common/interceptors/transform.interceptor.ts
import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler, HttpStatus,
} from '@nestjs/common';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {ApiResponse} from '../interfaces/api-response.interface';

@Injectable()
export class TransformInterceptor<T>
    implements NestInterceptor<T, ApiResponse<T>> {
    intercept(
        context: ExecutionContext,
        next: CallHandler,
    ): Observable<ApiResponse<T>> {
        const response = context.switchToHttp().getResponse();


        return next.handle().pipe(
            map(data => {
                let message = 'Request successful';
                if (data && typeof data === 'object' && 'message' in data && typeof data.message === 'string') {
                    message = data.message;
                }
                return {
                    statusCode: response.statusCode, // 🔥 Extracted from response
                    message,
                    success: true,
                    data,
                    error: null,
                    timestamp: new Date().toISOString(),
                };
            }),
        );
    }
}
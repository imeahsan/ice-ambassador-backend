import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
    catch(exception: any, host: ArgumentsHost) {
        console.log('Exception:', exception);

        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();

        // Prevent double response if headers already sent (e.g., after res.redirect)
        if (response.headersSent) {
            return;
        }
        let status = HttpStatus.INTERNAL_SERVER_ERROR;
        let message: string = exception.message || 'Internal server error';
        let validationErrors: any = null;
        let exceptionData: any = null;

        // Handle built-in HTTP exceptions
        if (exception instanceof BadRequestException) {
            const res = exception.getResponse() as any;
            message = res?.message || 'Validation failed';
            validationErrors = res?.error?.details || null;
            exceptionData = res?.data || null;
            status = exception.getStatus();
        } else if (exception instanceof HttpException) {
            const res = exception.getResponse();
            status = exception.getStatus();
            if (typeof res === 'object' && res !== null) {
                message = typeof res['message'] === 'string' ? res['message'] : 'Validation failed';
                validationErrors = res['details'];
                exceptionData = res['data'] || null;
            } else {
                message = exception.message;
            }
        }

        // Handle MongoDB duplicate key error (E11000)
        if (exception?.code === 11000) {
            status = HttpStatus.CONFLICT;
            const duplicateField = Object.keys(exception?.keyValue || {})[0];
            const duplicateValue = exception?.keyValue?.[duplicateField];

            message = `Duplicate value for field '${duplicateField}': '${duplicateValue}'`;

            validationErrors = {
                field: duplicateField,
                value: duplicateValue,
            };
        }

        response.status(status).json({
            success: false,
            data: {}, // Optional: You can pass extra data here
            message,
            statusCode: status,
            error: {
                details: validationErrors || exceptionData,
            },
            timestamp: new Date().toISOString(),
        });
    }
}

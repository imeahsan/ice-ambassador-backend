import {NestFactory} from '@nestjs/core';
import {AppModule} from './app.module';
import {json} from "express";
import {BadRequestException, ValidationPipe} from "@nestjs/common";
import {TransformInterceptor} from "./common/interceptors/transform.interceptor";
import {GlobalExceptionFilter} from "./common/filters/http-expception.filter";

require('dotenv').config(); // add this line at the top of main.ts
import * as morgan from 'morgan';
async function bootstrap() {
    const app = await NestFactory.create(AppModule,{
        rawBody:true
    });
    app.setGlobalPrefix('api'); // Set global prefix for all routes

    app.use(json({limit: '10mb'}));

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
            exceptionFactory: (errors) => {
                const formattedErrors = {};
                errors.forEach((error) => {
                    if (error.constraints) {
                        formattedErrors[error.property] = Object.values(error.constraints);
                    }
                });

                // Return structured error object
                return new BadRequestException({
                    success: false,
                    data: null,
                    error: {
                        message: 'Validation failed',
                        code: 400,
                        details: formattedErrors, // ✅ key-value errors here
                    },
                    timestamp: new Date().toISOString(),
                });
            },
        }),
    );

    app.useGlobalInterceptors(new TransformInterceptor());
    app.useGlobalFilters(new GlobalExceptionFilter());
    app.use(morgan('combined')); // or 'combined', 'dev'

    await app.listen(3701);
    console.log('Server running on http://localhost:3701');
}

bootstrap();

import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User, UserSchema } from '../schemas/user.schema';
import { EmailModule } from '../common/email/email.module';
import { zodValidationMiddleware } from '../common/validation/zod-validation.middleware';
import {
  RegisterSchema,
  LoginSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  VerifyEmailSchema,
  ResendVerificationSchema,
} from '../common/validation/auth.validation';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || process.env.JWT_SECRET,
        signOptions: {},
      }),
    }),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    EmailModule,
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(zodValidationMiddleware(RegisterSchema))
      .forRoutes({ path: 'auth/register', method: RequestMethod.POST });
    consumer
      .apply(zodValidationMiddleware(LoginSchema))
      .forRoutes({ path: 'auth/login', method: RequestMethod.POST });
    consumer
      .apply(zodValidationMiddleware(ForgotPasswordSchema))
      .forRoutes({ path: 'auth/forgot-password', method: RequestMethod.POST });
    consumer
      .apply(zodValidationMiddleware(ResetPasswordSchema))
      .forRoutes({ path: 'auth/reset-password', method: RequestMethod.POST });
    consumer
      .apply(zodValidationMiddleware(VerifyEmailSchema))
      .forRoutes({ path: 'auth/verify-email', method: RequestMethod.POST });
    consumer
      .apply(zodValidationMiddleware(ResendVerificationSchema))
      .forRoutes({ path: 'auth/resend-verification', method: RequestMethod.POST });
  }
}
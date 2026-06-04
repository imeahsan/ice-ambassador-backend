import {
  Logger,
  MiddlewareConsumer,
  Module,
  RequestMethod,
} from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { JwtModule } from '@nestjs/jwt';
import { JwtMiddleware } from './common/middleware/jwt.middleware';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { extname, join } from 'path';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { FilesModule } from './modules/files/files.module';
import { UserModule } from './modules/user/user.module';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { RedisModule } from './common/redis/redis.module';
import { JobsModule } from './jobs/jobs.module';
import { RedisRateLimitMiddleware } from './common/middleware/redis-rate-limit.middleware';

import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ApiKeysModule } from './modules/api-keys/api-keys.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    // SocketModule,
    ConfigModule.forRoot({ isGlobal: true }),
    RedisModule,
    JobsModule,
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
        connectionFactory: (connection) => {
          connection.on('connected', () => {
            Logger.log('MongoDB connected successfully');
          });
          connection.on('error', (error) => {
            Logger.error('MongoDB connection error:', error);
          });
          connection.on('disconnected', () => {
            Logger.warn('MongoDB disconnected');
          });
          return connection;
        },
      }),
      inject: [ConfigService],
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: () => ({
        secret: process.env.JWT_SECRET || '',
        signOptions: {
          // expiresIn: '1d',
          // algorithm: 'HS256',
        },
      }),
      inject: [ConfigService],
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    MulterModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        storage: diskStorage({
          destination: configService.get<string>('UPLOAD_DIR') || './uploads',
          filename: (req, file, callback) => {
            const uniqueSuffix =
              Date.now() + '-' + Math.round(Math.random() * 1e9);
            const ext = extname(file.originalname);
            const filename = `${uniqueSuffix}${ext}`;
            callback(null, filename);
          },
        }),
        limits: {
          fileSize:
            parseInt(<string>configService.get<string>('MAX_FILE_SIZE')) ||
            10 * 1024 * 1024,
        },
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    FilesModule,
    UserModule,
    ApiKeysModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RedisRateLimitMiddleware, JwtMiddleware)
      .exclude(
        { path: 'auth/signup', method: RequestMethod.ALL },
        { path: 'auth/verify-otp', method: RequestMethod.ALL },
        { path: 'auth/web-driver-signup', method: RequestMethod.POST },
        { path: 'auth/web-customer-signup', method: RequestMethod.POST },
        { path: 'webhook/stripe', method: RequestMethod.ALL },
        { path: 'webhook/connect/stripe', method: RequestMethod.ALL },
        { path: 'auth/login', method: RequestMethod.ALL },
        { path: 'auth/verify', method: RequestMethod.ALL },
        { path: 'auth/resend', method: RequestMethod.ALL },
        { path: 'auth/forgot', method: RequestMethod.ALL },
        { path: 'auth/reset', method: RequestMethod.ALL },
        { path: 'auth/change', method: RequestMethod.ALL },
        { path: 'files/upload', method: RequestMethod.POST },
        { path: 'files/(.*)', method: RequestMethod.ALL },
        { path: 'auth/phone-login/request-otp', method: RequestMethod.ALL },
        { path: 'auth/phone-login/verify-otp', method: RequestMethod.ALL },
        { path: 'api-keys/(.*)', method: RequestMethod.ALL },
      )
      .forRoutes({ path: '(.*)', method: RequestMethod.ALL });
    consumer
      .apply(LoggerMiddleware)
      .forRoutes({ path: '(.*)', method: RequestMethod.ALL });
  }
}

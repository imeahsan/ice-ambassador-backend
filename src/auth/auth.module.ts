import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../schemas/user.schema';
import {TwilioModule} from "../common/twilio/twilio.module";
import {EmailModule} from "../common/email/email.module";
import {Vehicle, VehicleSchema} from "../schemas/vehicle.schema";
import {DeletedUser, DeletedUserSchema} from "../schemas/deleted-user.schema";

@Module({
  imports: [
      EmailModule,
      TwilioModule,
    JwtModule.register({
      secret: 'secretkey', // Secret key for signing JWTs
      signOptions: { }, // Token expiry durationd
    }),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    MongooseModule.forFeature([{ name: Vehicle.name, schema: VehicleSchema }]),
    MongooseModule.forFeature([{ name: DeletedUser.name, schema: DeletedUserSchema  }]),
    Vehicle
  ],
  controllers: [AuthController],
  providers: [AuthService,],
})
export class AuthModule {}
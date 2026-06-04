import {Module} from '@nestjs/common';
import {UserController} from './user.controller';
import {UserService} from './user.service';
import {EmailModule} from "../../common/email/email.module";
import {TwilioModule} from "../../common/twilio/twilio.module";
import {JwtModule} from "@nestjs/jwt";
import {InjectModel, MongooseModule} from "@nestjs/mongoose";
import {User, UserSchema} from "../../schemas/user.schema";
import {VehicleService} from "./vehicle.service";
import {Vehicle, VehicleSchema} from "../../schemas/vehicle.schema";
import { VehicleController } from './vehicle.controller';
import { Feedback, FeedbackSchema } from '../../schemas/feedback.schema';

@Module({
    controllers: [UserController, VehicleController],
    providers: [UserService, VehicleService],
    imports: [
        // EmailModule,
        // TwilioModule,
        // JwtModule.register({
        //   secret: 'secretkey', // Secret key for signing JWTs
        //   signOptions: { expiresIn: '1d' }, // Token expiry duration
        // }),
        MongooseModule.forFeature([{name: User.name, schema: UserSchema}]),
        MongooseModule.forFeature([{name: Vehicle.name, schema: VehicleSchema}]),
        MongooseModule.forFeature([{name: Feedback.name, schema: FeedbackSchema}]),

    ],
    exports: [UserService],
})
export class UserModule {
}

import {Module} from '@nestjs/common';
import {UserController} from './user.controller';
import {UserService} from './user.service';
import {EmailModule} from "../../common/email/email.module";

import {JwtModule} from "@nestjs/jwt";
import {InjectModel, MongooseModule} from "@nestjs/mongoose";
import {User, UserSchema} from "../../schemas/user.schema";


@Module({
    controllers: [UserController, ],
    providers: [UserService, ],
    imports: [
        // EmailModule,
        // TwilioModule,
        // JwtModule.register({
        //   secret: 'secretkey', // Secret key for signing JWTs
        //   signOptions: { expiresIn: '1d' }, // Token expiry duration
        // }),
        MongooseModule.forFeature([{name: User.name, schema: UserSchema}]),

    ],
    exports: [UserService],
})
export class UserModule {
}

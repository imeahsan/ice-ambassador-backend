import { Module } from '@nestjs/common';
import { FirebaseService } from './firebase.service';
import { UserModule } from '../user/user.module';
import {UserService} from "../user/user.service";

@Module({
  imports: [UserModule],
  providers: [FirebaseService,],
  exports: [FirebaseService],
})
export class FirebaseModule {}

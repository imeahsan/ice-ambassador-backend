// notification.module.ts or app.module.ts
import { Module } from '@nestjs/common';
import { TwilioService } from './twilio.service';
import {ConfigModule} from "@nestjs/config";

@Module({
    imports: [ConfigModule],
    providers: [TwilioService],
    exports: [TwilioService], // <== So it can be used elsewhere
})
export class TwilioModule {}

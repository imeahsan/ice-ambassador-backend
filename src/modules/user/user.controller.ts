import {
    Controller,
    Req,
    Get,
    Put,
    Body
} from '@nestjs/common';

import {UserService} from "./user.service";
import {RequestWithUser} from "../../common/interfaces/request-with-user.interface";
import {SetProfileDTO} from "./dto/setProfile.dto";

@Controller('user')
export class UserController {
    constructor(private readonly userService: UserService) {}

    @Get('')
    async getProfile(@Req() req: RequestWithUser) {
        const profile = await this.userService.getProfile(req.userId);
        return {
            profile
        }
    }

    @Put('')
    async setProfile(@Body() data: SetProfileDTO, @Req() req: RequestWithUser) {
        const profile = await this.userService.setProfile(req.userId, data);
        return {
            profile
        }
    }
}

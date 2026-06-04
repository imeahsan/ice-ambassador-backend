import {
    Controller,
    Post,
    Req,
    Param,
    Get,
    Put,
    Body
} from '@nestjs/common';

import {UserService} from "./user.service";
import {RequestWithUser} from "../../common/interfaces/request-with-user.interface";
import {SetProfileDTO} from "./dto/setProfile.dto";
import {VehicleService} from "./vehicle.service";
import {UpdateVehicleDto} from "./dto/updateVehicle.dto";
import { UpdateDeliveryMethodDto } from './dto/updateDeliveryMethod.dto';


@Controller('user')
export class UserController {
    constructor(private readonly userService: UserService,
                private readonly vehicleService: VehicleService) {
    }


//get profile
    @Get('')
    async getProfile(@Req() req: RequestWithUser,) {

        const profile = await this.userService.getProfile(req.userId);
        return {
            profile
        }
    }

    @Put('')
    async setProfile(@Body() data: SetProfileDTO, @Req() req: RequestWithUser,) {
        const profile = await this.userService.setProfile(req.userId, data);
        return {
            profile
        }
    }

    @Post('verify-driver')
    async verifyDriver( @Body() data:{userId:string},) {
        const res = await this.userService.verifyDriver(data.userId,);
        return {
            res
        }
    }

    @Get('vehicle/:userId')
    getByUserId(@Req() req: RequestWithUser) {
        return this.vehicleService.findByUserId(req.userId);
    }

    @Put('vehicle/:userId')
    updateByUserId(
        @Param('userId') userId: string,
        @Body() dto: UpdateVehicleDto,
    ) {
        return this.vehicleService.updateByUserId(userId, dto);
    }



    @Put('delivery-method')
    async updateDeliveryMethod(@Body() dto: UpdateDeliveryMethodDto, @Req() req: RequestWithUser) {
        const updated = await this.userService.updateDeliveryMethod(req.userId, dto.deliveryMethod);
        return { profile: updated };
    }
}

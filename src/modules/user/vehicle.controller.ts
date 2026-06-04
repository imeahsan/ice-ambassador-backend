import {Controller, Delete, Param, NotFoundException, HttpCode, HttpStatus, Req} from '@nestjs/common';
import { VehicleService } from './vehicle.service';
import {RequestWithUser} from "../../common/interfaces/request-with-user.interface";

@Controller('vehicle')
export class VehicleController {
  constructor(private readonly vehicleService: VehicleService) {}

  @Delete('/')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteVehicle(@Req() req: RequestWithUser): Promise<void> {
    const success = await this.vehicleService.deleteByUserId(req.userId);
    if (!success) {
      throw new NotFoundException('Vehicle not found');
    }
  }
}


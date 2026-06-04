// src/auth/dto/signup-with-vehicle.dto.ts

import { SignupDto } from './signup.dto';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import {UpdateVehicleDto} from "../../modules/user/dto/updateVehicle.dto";

export class SignupWithVehicleDto {
    @ValidateNested()
    @Type(() => SignupDto)
    user: SignupDto;

    @ValidateNested()
    @Type(() => UpdateVehicleDto)
    vehicle: UpdateVehicleDto;
}

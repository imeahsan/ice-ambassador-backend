// src/vehicle/dto/create-vehicle.dto.ts
import { Type } from 'class-transformer';
import {
    IsString,
    IsOptional,
    IsNotEmpty,
    IsNumber,
    IsDate,
} from 'class-validator';

export class UpdateVehicleDto {


    @IsString()
    make: string;

    @IsString()
    model: string;

    @IsNumber()
    year: number;

    @IsOptional()
    @IsString()
    color?: string;

    @IsNotEmpty()
    @IsString()
    plateNumber: string;

    @IsOptional()
    @IsString()
    vin?: string;

    @IsOptional()
    @IsDate()
    @Type(() => Date)

    registrationExpiry?: Date;

    @IsOptional()
    @IsString()
    insuranceProvider?: string;

    @IsOptional()
    @IsDate()
    @Type(() => Date)
    insuranceExpiry?: Date;
}

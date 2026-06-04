import {IsNotEmpty, IsNumber, IsString, ValidateNested} from 'class-validator';
import {Type} from 'class-transformer';

export class AcceptDeliveryDto {
    @IsString()
    deliveryId: string;

}

export class DeliveryStatusUpdateDto {
    @IsString()
    deliveryId: string;

    @IsString()
    status: string;

}
export class LatLngDto {
    @IsNumber()
    lat: number;

    @IsNumber()
    lng: number;
}

export class UpdateDeliveryLocationDto {
    @IsString()
    deliveryId: string;

    @IsNotEmpty()
    @IsString()
    customerId: string;

    @ValidateNested()
    @Type(() => LatLngDto)
    point: LatLngDto;
}

export class EndDeliveryDto {
    @IsString()
    deliveryId: string;

    @ValidateNested()
    @Type(() => LatLngDto)
    endLocation: LatLngDto;
}


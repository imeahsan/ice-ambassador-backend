import { IsIn, IsNotEmpty } from 'class-validator';

export class UpdateDeliveryMethodDto {
    @IsNotEmpty({ message: 'deliveryMethod is required' })
    @IsIn(['car', 'bike', 'scooter', 'walk'], { message: 'Provide a valid delivery method' })
    deliveryMethod: string;
}


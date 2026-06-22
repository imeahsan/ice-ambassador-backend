import { IsOptional, IsString, IsNotEmpty } from 'class-validator';

export class SetProfileDTO {
    @IsString()
    @IsNotEmpty()
    @IsOptional()
    firstName?: string;

    @IsString()
    @IsNotEmpty()
    @IsOptional()
    lastName?: string;
}

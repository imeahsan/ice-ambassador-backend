import {IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString} from 'class-validator';

export class SetProfileDTO {
    @IsDateString()
    dob: string;

    @IsEnum(['male', 'female', 'other'], {
        message: 'Gender must be one of: male, female, other',
    })
    gender: 'male' | 'female' | 'other';

    @IsString()
    @IsNotEmpty()
    profilePic: string;

    @IsString()
    @IsOptional()
    idPic: string;

    @IsString()
    @IsOptional()
    idBackPic: string;
}

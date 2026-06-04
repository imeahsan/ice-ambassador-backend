import {IsEmail, IsNotEmpty, IsString, Matches} from 'class-validator';

export class ResetPasswordDto {
    @IsNotEmpty()
    @IsString()
    // Simple email or phone regex for validation
    @Matches(/^([^\s@]+@[^\s@]+\.[^\s@]+|\+?\d{10,15})$/, {
        message: 'Identifier must be a valid email or phone number',
    })
    identifier: string;

    @IsNotEmpty()
    @IsString()
    otp: string;

    @IsNotEmpty()
    @IsString()
    password: string;
}

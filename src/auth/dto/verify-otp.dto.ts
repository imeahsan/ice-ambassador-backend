// verify-otp.dto.ts
import {IsIn, IsNotEmpty, IsOptional, IsString, Matches, ValidateIf} from 'class-validator';

export class VerifyOtpDto {


    @Matches(
        /^(\+?[1-9]\d{1,14}|[^@\s]+@[^@\s]+\.[^@\s]+)$/,
        { message: 'Identifier must be a valid email or phone number' }
    )
    identifier: string;

    @IsNotEmpty()
    @IsString()
    otp: string;
}

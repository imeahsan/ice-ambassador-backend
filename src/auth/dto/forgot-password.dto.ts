import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class ForgotPasswordDto {
    @IsNotEmpty()
    @IsString()
    // Simple email or phone regex for validation
    @Matches(/^([^\s@]+@[^\s@]+\.[^\s@]+|\+?\d{10,15})$/, {
        message: 'Identifier must be a valid email or phone number',
    })
    identifier: string;
}

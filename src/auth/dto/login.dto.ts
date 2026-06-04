import {
    IsNotEmpty,
    IsString,
    Matches,
} from 'class-validator';

export class LoginDto {
    @Matches(
        /^(\+?[1-9]\d{1,14}|[^@\s]+@[^@\s]+\.[^@\s]+)$/,
        { message: 'Identifier must be a valid email or phone number' }
    )
    identifier: string;

    @IsNotEmpty({ message: 'Password is required' })
    password: string;
}

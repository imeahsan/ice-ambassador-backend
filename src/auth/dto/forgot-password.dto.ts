import { Allow } from 'class-validator';

export class ForgotPasswordDto {
    @Allow()
    email: string;
}

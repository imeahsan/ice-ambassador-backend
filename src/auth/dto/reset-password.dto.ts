import { Allow } from 'class-validator';

export class ResetPasswordDto {
    @Allow()
    token: string;

    @Allow()
    newPassword: string;
}

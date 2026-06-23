import { Allow } from 'class-validator';

export class VerifyEmailDto {
    @Allow()
    token: string;
}

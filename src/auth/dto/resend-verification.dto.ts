import { Allow } from 'class-validator';

export class ResendVerificationDto {
    @Allow()
    email: string;
}

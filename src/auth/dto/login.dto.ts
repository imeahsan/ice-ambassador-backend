import { Allow } from 'class-validator';

export class LoginDto {
    @Allow()
    email: string;

    @Allow()
    password: string;
}

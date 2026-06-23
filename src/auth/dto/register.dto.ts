import { Allow } from 'class-validator';

export class RegisterDto {
    @Allow()
    email: string;

    @Allow()
    phone: string;

    @Allow()
    password: string;

    @Allow()
    firstName: string;

    @Allow()
    lastName: string;

    @Allow()
    userType: string;

    @Allow()
    referredByCode?: string;

    @Allow()
    iceDriverId?: string;
}

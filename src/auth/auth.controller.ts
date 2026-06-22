import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @HttpCode(HttpStatus.CREATED)
    @Post('register')
    async register(@Body() body: RegisterDto) {
        return this.authService.register(body);
    }

    @HttpCode(HttpStatus.OK)
    @Post('login')
    async login(@Body() body: LoginDto) {
        return this.authService.login(body);
    }

    @HttpCode(HttpStatus.OK)
    @Post('forgot-password')
    async forgotPassword(@Body() body: ForgotPasswordDto) {
        return this.authService.forgotPassword(body);
    }

    @HttpCode(HttpStatus.OK)
    @Post('reset-password')
    async resetPassword(@Body() body: ResetPasswordDto) {
        return this.authService.resetPassword(body);
    }

    @HttpCode(HttpStatus.OK)
    @Post('verify-email')
    async verifyEmail(@Body() body: VerifyEmailDto) {
        return this.authService.verifyEmail(body);
    }

    @HttpCode(HttpStatus.OK)
    @Post('resend-verification')
    async resendVerification(@Body() body: ResendVerificationDto) {
        return this.authService.resendVerification(body);
    }
}

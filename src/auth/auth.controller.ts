import {Body, Controller, Delete, HttpCode, HttpStatus, Post, Req, UseGuards} from '@nestjs/common';
import {AuthService} from './auth.service';
import {SignupDto} from './dto/signup.dto';
import {LoginDto} from './dto/login.dto';
import {VerifyOtpDto} from "./dto/verify-otp.dto";
import {logger} from "handlebars";
import {ResendOtpDto} from "./dto/resend-otp.dto";
import {ForgotPasswordDto} from "./dto/forgot-password.dto";
import {ResetPasswordDto} from "./dto/reset-password.dto";
import {ChangePasswordDto} from "./dto/change-password.dto";
import {SignupWithVehicleDto} from "./dto/signup-with-vehicle.dto";
import {RequestWithUser} from "../common/interfaces/request-with-user.interface";


@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) {
    }

    @HttpCode(HttpStatus.CREATED)
    @Post('signup')
    signup(@Body() body: SignupDto) {
        console.log('signup', body);
        return this.authService.signup(body);
    }

    @Post('web-driver-signup')
    async signupWithVehicle(@Body() dto: SignupWithVehicleDto) {
        return this.authService.signupWithVehicle(dto);
    }

    @Post('web-customer-signup')
    async customerSignup(@Body() dto: SignupDto) {
        return this.authService.customerSignup(dto);
    }


    @Post('login')
    login(@Body() body: LoginDto) {
        return this.authService.login(body);
    }

    @Post('verify')
    verify(@Body() body: VerifyOtpDto) {

        return this.authService.verifyContact(body.identifier, body.otp, );
    }

    @Post('verify-otp')
    async verifyOtp(@Body() body: VerifyOtpDto) {
        return this.authService.verifyOtp(body.identifier, body.otp);
    }

    @Post('resend')
    resend(@Body() data: ResendOtpDto) {

        return this.authService.resendOtp(data.identifier);
    }

    // forgot password
    @Post('forgot')
    forgot(@Body() body: ForgotPasswordDto) {
        return this.authService.forgotPassword(body.identifier);
    }

    // reset password
    @Post('reset')
    reset(@Body() body: ResetPasswordDto) {
        return this.authService.resetPassword(body.identifier, body.password, body.otp);
    }

    // change password
    @Post('change')
    change(@Body() body: ChangePasswordDto) {
        return this.authService.changePassword(body.identifier, body.oldPassword, body.newPassword);
    }

    @Post('logout')
    async logout() {
        // The client should remove token on their side
        return {message: 'Logout successful, please delete your token on client'};
    }

    @Delete('delete-account')
    async deleteAccount(@Req() req: RequestWithUser) {
        // The client should remove token on their side
        return  this.authService.deleteUser(req.userId);

    }

    @Post('phone-login/request-otp')
    async requestPhoneLoginOtp(@Body('phone') phone: string) {
        return this.authService.requestPhoneLoginOtp(phone);
    }

    @Post('phone-login/verify-otp')
    async verifyPhoneLoginOtp(@Body() body: { phone: string; otp: string }) {
        return this.authService.verifyPhoneLoginOtp(body.phone, body.otp);
    }


}

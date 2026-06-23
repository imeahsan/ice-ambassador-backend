import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { User, UserDocument } from '../schemas/user.schema';
import { EmailService } from '../common/email/email.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

  async register(data: RegisterDto) {
    const emailLower = data.email.toLowerCase();

    // Duplicate check on email
    const existingEmailUser = await this.userModel.findOne({ email: emailLower });
    if (existingEmailUser) {
      throw new BadRequestException('Email already registered');
    }

    // Normalize phone (digits-only)
    const phoneNormalized = data.phone.replace(/\D/g, '');

    // Duplicate check on phone
    const existingPhoneUser = await this.userModel.findOne({ phone: phoneNormalized });
    if (existingPhoneUser) {
      throw new BadRequestException('Phone already registered');
    }

    // Password hashed with bcrypt, cost factor 12
    const passwordHash = await bcrypt.hash(data.password, 12);

    // Referral code generation: ICE-[NAME][4CHARS]
    // Clean name segment from firstName (alphabetic chars only, uppercase)
    const nameSegment = data.firstName.replace(/[^a-zA-Z]/g, '').toUpperCase();

    let referralCode = '';
    let isUnique = false;
    let attempts = 0;

    while (attempts < 10 && !isUnique) {
      // 4 random alphanumeric chars in uppercase
      const randomChars = this.generateRandomChars(4);
      referralCode = `ICE-${nameSegment}${randomChars}`;
      const existing = await this.userModel.findOne({ referralCode });
      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      throw new BadRequestException('Failed to generate a unique referral code');
    }

    // Referral linking
    let referredByUserId: string | null = null;
    if (data.referredByCode) {
      const referrer = await this.userModel.findOne({
        referralCode: data.referredByCode.toUpperCase(),
      });
      if (referrer) {
        referredByUserId = referrer._id.toString();
      }
    }

    // Create new user
    const newUser = new this.userModel({
      email: emailLower,
      phone: phoneNormalized,
      password: passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      userType: data.userType,
      referralCode,
      referredByUserId,
      iceDriverId: data.userType === 'PARTNER' ? (data.iceDriverId || null) : null,
    });

    // Generate numeric email verification OTP code (6 digits)
    const verificationToken = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationTokenHash = crypto.createHash('sha256').update(verificationToken).digest('hex');
    const verificationExpiresAt = new Date();
    verificationExpiresAt.setHours(verificationExpiresAt.getHours() + 24); // 24-hour expiry

    newUser.emailVerificationTokens = [{
      tokenHash: verificationTokenHash,
      expiresAt: verificationExpiresAt,
      used: false,
    }];

    await newUser.save();

    console.log(`[DEVELOPMENT] Verification code for ${newUser.email}: ${verificationToken}`);

    // Send email verification code
    try {
      await this.emailService.sendVerificationEmail(newUser.email, verificationToken);
    } catch (error) {
      // Log or handle, but do not block registration return
    }

    // Sign JWT tokens
    const tokens = this.generateTokens(newUser);

    // Exclude password in return
    const userObj = newUser.toObject() as any;
    delete userObj.password;

    return {
      user: userObj,
      tokens,
    };
  }

  async login(data: LoginDto) {
    const emailLower = data.email.toLowerCase();

    // 1. Find user by lowercased email
    const user = await this.userModel.findOne({ email: emailLower });
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // 2. Check if user has a password
    if (!user.password) {
      throw new ForbiddenException({
        message: 'Password reset is required. Please go through the forgot-password flow.',
        code: 'PASSWORD_RESET_REQUIRED',
        errorCode: 'PASSWORD_RESET_REQUIRED',
      });
    }

    // 3. Check account status is ACTIVE
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active');
    }

    // 4. Compare bcrypt password hash
    const isPasswordValid = await bcrypt.compare(data.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // 5. Update lastLoginAt
    user.lastLoginAt = new Date();
    await user.save();

    // 6. Generate access & refresh tokens
    const tokens = this.generateTokens(user);

    // 7. Exclude password hash from response
    const userObj = user.toObject() as any;
    delete userObj.password;

    return {
      user: userObj,
      tokens,
    };
  }

  private generateRandomChars(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private generateTokens(user: UserDocument) {
    const payload = {
      userId: user._id.toString(),
      uid: user._id.toString(), // Keep uid for compatibility with JwtMiddleware
      email: user.email,
      userType: user.userType,
    };
    const accessTokenExpires = this.configService.get<string>('JWT_EXPIRES_IN') || 
                               this.configService.get<string>('config.jwt.expiresIn') || 
                               '15m'; // short-lived default
    const refreshTokenExpires = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || 
                                this.configService.get<string>('config.jwt.refreshExpiresIn') || 
                                '7d'; // long-lived default

    const accessToken = this.jwtService.sign(payload, { expiresIn: accessTokenExpires as any });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: refreshTokenExpires as any });

    return { accessToken, refreshToken };
  }

  async forgotPassword(data: ForgotPasswordDto) {
    const emailLower = data.email.toLowerCase();
    const user = await this.userModel.findOne({ email: emailLower });

    // Always return generic 200 message - never reveal if email is registered
    const successResponse = {
      message: 'If that email exists, a reset link has been sent',
    };

    if (!user) {
      return successResponse;
    }

    // Generate single-use, time-limited reset token (1-hour expiry)
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1-hour expiry

    if (!user.resetTokens) {
      user.resetTokens = [];
    }
    user.resetTokens.push({
      tokenHash,
      expiresAt,
      used: false,
    });

    await user.save();

    // Reset link uses the frontend reset URL on app.iceridepartners.com
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'https://app.iceridepartners.com';
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;

    console.log(`[DEVELOPMENT] Password reset link for ${user.email}: ${resetLink}`);
    console.log(`[DEVELOPMENT] Raw password reset token: ${token}`);

    try {
      await this.emailService.sendPasswordResetEmail(user.email, resetLink);
    } catch (error) {
      // Log error but do not fail or expose to user
    }

    return successResponse;
  }

  async resetPassword(data: ResetPasswordDto) {
    const tokenHash = crypto.createHash('sha256').update(data.token).digest('hex');

    // Find the user who has a matching token hash in their resetTokens
    const user = await this.userModel.findOne({
      'resetTokens.tokenHash': tokenHash,
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const tokenEntry = user.resetTokens?.find((t) => t.tokenHash === tokenHash);

    if (!tokenEntry || tokenEntry.used || new Date() > tokenEntry.expiresAt) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Hash the new password (bcrypt, cost 12)
    const passwordHash = await bcrypt.hash(data.newPassword, 12);
    user.password = passwordHash;


    // Invalidate ALL existing reset tokens for that user
    user.resetTokens?.forEach((t) => {
      t.used = true;
    });

    await user.save();

    return {
      message: 'Password has been reset successfully',
    };
  }

  async verifyEmail(data: VerifyEmailDto) {
    const tokenHash = crypto.createHash('sha256').update(data.token).digest('hex');

    // Find the user with matching email verification token
    const user = await this.userModel.findOne({
      'emailVerificationTokens.tokenHash': tokenHash,
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    if (user.emailVerifiedAt !== null) {
      return {
        message: 'Email is already verified',
      };
    }

    const tokenEntry = user.emailVerificationTokens?.find((t) => t.tokenHash === tokenHash);

    if (!tokenEntry || tokenEntry.used || new Date() > tokenEntry.expiresAt) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    // Valid token: mark verified, invalidate token
    user.emailVerifiedAt = new Date();
    user.status = 'ACTIVE';
    user.emailVerificationTokens?.forEach((t) => {
      t.used = true;
    });

    await user.save();

    return {
      message: 'Email verified successfully',
    };
  }

  async resendVerification(data: ResendVerificationDto) {
    const emailLower = data.email.toLowerCase();
    const user = await this.userModel.findOne({ email: emailLower });

    // Generic success response to avoid email enumeration
    const successResponse = {
      message: 'If that email exists, a verification code has been sent',
    };

    if (!user) {
      return successResponse;
    }

    if (user.emailVerifiedAt !== null) {
      return {
        message: 'Email is already verified',
      };
    }

    // Invalidate all prior verification tokens
    user.emailVerificationTokens?.forEach((t) => {
      t.used = true;
    });

    // Generate a fresh verification OTP code (6 digits)
    const verificationToken = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationTokenHash = crypto.createHash('sha256').update(verificationToken).digest('hex');
    const verificationExpiresAt = new Date();
    verificationExpiresAt.setHours(verificationExpiresAt.getHours() + 24); // 24-hour expiry

    if (!user.emailVerificationTokens) {
      user.emailVerificationTokens = [];
    }
    user.emailVerificationTokens.push({
      tokenHash: verificationTokenHash,
      expiresAt: verificationExpiresAt,
      used: false,
    });

    await user.save();

    console.log(`[DEVELOPMENT] Fresh verification code for ${user.email}: ${verificationToken}`);

    try {
      await this.emailService.sendVerificationEmail(user.email, verificationToken);
    } catch (error) {
      // Log or handle, but do not fail response
    }

    return successResponse;
  }
}

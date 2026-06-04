import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { Model } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';
import * as bcrypt from 'bcryptjs';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { TwilioService } from '../common/twilio/twilio.service';
import { EmailService } from '../common/email/email.service';
import { MessageTemplates } from '../common/messages';
import { generateOtp } from '../common/utils/otpgenerator';
import { SignupWithVehicleDto } from './dto/signup-with-vehicle.dto';
import { Vehicle, VehicleDocument } from '../schemas/vehicle.schema';
import {
  DeletedUser,
  DeletedUserDocument,
} from '../schemas/deleted-user.schema';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Vehicle.name) private vehicleModel: Model<VehicleDocument>,
    @InjectModel(DeletedUser.name)
    private deletedUserModel: Model<DeletedUserDocument>,

    private jwtService: JwtService,
    private twilioService: TwilioService,
    private emailService: EmailService,
  ) {}

  async signup(data: SignupDto) {
    const normalizedEmail = data.email.toLowerCase();

    // Check if any user has this verified email
    const existingEmailUser = await this.userModel.findOne({
      email: { $regex: new RegExp(`^${normalizedEmail}$`, 'i') },
    });
    if (existingEmailUser) {
      throw new ConflictException('Email already exists');
    }

    // Check if any user has this verified phone
    const existingPhoneUser = await this.userModel.findOne({
      phone: data.phone,
    });
    if (existingPhoneUser) {
      throw new ConflictException('Phone number already exists');
    }

    // Optionally remove old unverified users with same email or phone
    await this.userModel.deleteMany({
      $or: [
        {
          email: { $regex: new RegExp(`^${normalizedEmail}$`, 'i') },
          isEmailVerified: false,
        },
        { phone: data.phone, isPhoneVerified: false },
      ],
    });

    const hashed = await bcrypt.hash(data.password, 10);
    const phoneOTP = generateOtp();
    const emailOTP = generateOtp();

    const user = new this.userModel({
      ...data,
      email: normalizedEmail,
      password: hashed,
      OTP: phoneOTP,
      emailOTP: emailOTP,
      role: 'driver',
    });

    // await this.twilioService.sendSms(data.phone, MessageTemplates.verificationCode(phoneOTP));
    // await this.emailService.sendTemplatedEmail(
    //     'emailVerification',
    //     {
    //         otpCode: emailOTP,
    //         currentYear: new Date().getFullYear()
    //     },
    //     'Email Verification',
    //     [data.email]
    // );

    await user.save();
    return { message: 'User created successfully' };
  }
  async customerSignup(data: SignupDto) {
    const normalizedEmail = data.email.toLowerCase();

    // Check if any user has this verified email
    const existingEmailUser = await this.userModel.findOne({
      email: { $regex: new RegExp(`^${normalizedEmail}$`, 'i') },
    });
    if (existingEmailUser) {
      throw new ConflictException('Email already exists');
    }

    // Check if any user has this verified phone
    const existingPhoneUser = await this.userModel.findOne({
      phone: data.phone,
    });
    if (existingPhoneUser) {
      throw new ConflictException('Phone number already exists');
    }

    // Optionally remove old unverified users with same email or phone
    await this.userModel.deleteMany({
      $or: [
        {
          email: { $regex: new RegExp(`^${normalizedEmail}$`, 'i') },
          isEmailVerified: false,
        },
        { phone: data.phone, isPhoneVerified: false },
      ],
    });

    const hashed = await bcrypt.hash(data.password, 10);
    const phoneOTP = generateOtp();
    const emailOTP = generateOtp();

    const user = new this.userModel({
      ...data,
      email: normalizedEmail,
      password: hashed,
      OTP: phoneOTP,
      emailOTP: emailOTP,
      role: 'customer',
    });

    await this.twilioService.sendSms(
      data.phone,
      MessageTemplates.verificationCode(phoneOTP),
    );
    await this.emailService.sendTemplatedEmail(
      'emailVerification',
      {
        otpCode: emailOTP,
        currentYear: new Date().getFullYear(),
      },
      'Email Verification',
      [data.email],
    );

    await user.save();

    return { message: 'User created successfully' };
  }
  async signupWithVehicle(data: SignupWithVehicleDto) {
    const { user: userData, vehicle: vehicleData } = data;

    const normalizedEmail = userData.email.toLowerCase();

    const existingEmailUser = await this.userModel.findOne({
      email: { $regex: new RegExp(`^${normalizedEmail}$`, 'i') },
    });
    if (existingEmailUser) {
      throw new ConflictException('Email already exists');
    }

    const existingPhoneUser = await this.userModel.findOne({
      phone: userData.phone,
    });
    if (existingPhoneUser) {
      throw new ConflictException('Phone number already exists');
    }

    await this.userModel.deleteMany({
      $or: [
        {
          email: { $regex: new RegExp(`^${normalizedEmail}$`, 'i') },
          isEmailVerified: false,
        },
        { phone: userData.phone, isPhoneVerified: false },
      ],
    });

    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const phoneOTP = generateOtp();
    const emailOTP = generateOtp();

    const newUser = new this.userModel({
      ...userData,
      email: normalizedEmail,
      password: hashedPassword,
      OTP: phoneOTP,
      emailOTP: emailOTP,
      role: 'driver',
    });

    await this.vehicleModel.findOneAndUpdate(
      { userId: newUser._id },
      { $set: { ...vehicleData, userId: newUser._id } },
      { new: true, runValidators: true, upsert: true },
    );

    await newUser.save();

    await this.twilioService.sendSms(
      userData.phone,
      MessageTemplates.verificationCode(phoneOTP),
    );
    await this.emailService.sendTemplatedEmail(
      'emailVerification',
      {
        otpCode: emailOTP,
        currentYear: new Date().getFullYear(),
      },
      'Email Verification',
      [userData.email],
    );

    return {
      message: 'User and vehicle created successfully',
      userId: newUser._id,
    };
  }

  async login(data: LoginDto) {
    console.log(data);
    const identifier = data.identifier.trim().toLowerCase();

    const user = await this.userModel
      .findOne({
        $or: [{ email: identifier }, { phone: identifier }],
      })
      .exec();

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Require both verifications
    if (!user.isEmailVerified || !user.isPhoneVerified) {
      let message = '';

      if (!user.isEmailVerified && !user.isPhoneVerified) {
        message = 'Both email and phone must be verified';
      } else if (!user.isEmailVerified) {
        message = 'Email must be verified';
      } else if (!user.isPhoneVerified) {
        message = 'Phone must be verified';
      }

      throw new HttpException(
        {
          statusCode: HttpStatus.UNAUTHORIZED,
          message,
          data: {
            isEmailVerified: user.isEmailVerified,
            isPhoneVerified: user.isPhoneVerified,
          },
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    const match = await bcrypt.compare(data.password, user.password);
    if (!match) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.jwtService.sign({
      uid: (user as UserDocument)?._id?.toString(),
    });
    user.password = '';
    return { token, user };
  }

  async verifyContact(identifier: string, otp: string) {
    console.log(4545);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\+?[0-9]{7,15}$/; // adjust to your phone format

    let type: 'email' | 'phone';
    if (emailRegex.test(identifier)) {
      type = 'email';
    } else if (phoneRegex.test(identifier)) {
      type = 'phone';
    } else {
      throw new BadRequestException(
        'Identifier must be a valid email or phone number',
      );
    }

    const user = await this.userModel.findOne(
      type === 'email' ? { email: identifier } : { phone: identifier },
    );
    if (!user) throw new BadRequestException('User not found');

    if (type === 'email') {
      if (user.emailOTP !== otp) throw new BadRequestException('Invalid OTP');
      user.isEmailVerified = true;
    } else {
      if (user.OTP !== otp) throw new BadRequestException('Invalid OTP');
      user.isPhoneVerified = true;
    }

    await user.save();

    return {
      message: `${type.charAt(0).toUpperCase() + type.slice(1)} verified successfully`,
    };
  }

  async resendOtp(identifier: string) {
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
    const isPhone = /^\+?\d{10,15}$/.test(identifier); // Allows optional `+` and 10–15 digits

    if (!isEmail && !isPhone) {
      throw new BadRequestException('Invalid email or phone number');
    }
    const query = isEmail ? { email: identifier } : { phone: identifier };
    const user = await this.userModel.findOne(query);
    if (!user) throw new BadRequestException('User not found');

    const otp = generateOtp();
    let isOTPSent = false;
    let message = '';

    if (isEmail) {
      user.emailOTP = otp;

      try {
        await this.emailService.sendTemplatedEmail(
          'emailVerification',
          {
            otpCode: otp,
            currentYear: new Date().getFullYear(),
          },
          'Email Verification',
          [identifier],
        );
        isOTPSent = true;
        message = 'OTP sent successfully to email';
      } catch (err) {
        console.error('Email sending failed:', err);
        message = 'Failed to send OTP to email';
      }
    }

    if (isPhone) {
      user.OTP = otp;

      try {
        const result = await this.twilioService.sendSms(
          user.phone,
          MessageTemplates.verificationCode(otp),
        );
        if (result) {
          isOTPSent = true;
          message = 'OTP sent successfully to phone';
        } else {
          message = 'Failed to send OTP to phone';
        }
      } catch (err) {
        console.error('SMS sending failed:', err);
        message = 'Unable to send OTP, Please check your phone number';
      }
    }

    await user.save();

    if (!isOTPSent) {
      throw new BadRequestException(message);
    }

    return { message };
  }

  async forgotPassword(identifier: string) {
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
    const isPhone = /^\+?\d{10,15}$/.test(identifier); // Allows optional `+` and 10–15 digits

    if (!isEmail && !isPhone) {
      throw new BadRequestException('Invalid email or phone number');
    }

    const query = isEmail ? { email: identifier } : { phone: identifier };
    const user = await this.userModel.findOne(query);

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const otp = generateOtp();
    user.OTP = otp;
    user.emailOTP = otp;

    if (isPhone) {
      await this.twilioService.sendSms(
        user.phone,
        MessageTemplates.verificationCode(otp),
      );
    }

    if (isEmail) {
      await this.emailService.sendTemplatedEmail(
        'emailVerification',
        {
          otpCode: otp,
          currentYear: new Date().getFullYear(),
        },
        'Email Verification',
        [identifier],
      );
    }

    await user.save();
    return { message: 'OTP sent successfully' };
  }

  async resetPassword(identifier: string, password: string, otp: string) {
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
    const isPhone = /^\+?\d{10,15}$/.test(identifier); // Allows optional `+` and 10–15 digits

    if (!isEmail && !isPhone) {
      throw new BadRequestException('Invalid email or phone number');
    }

    const query = isEmail ? { email: identifier } : { phone: identifier };
    const user = await this.userModel.findOne(query);

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.OTP !== otp) {
      throw new BadRequestException('Invalid OTP');
    }

    const hashed = await bcrypt.hash(password, 10);
    user.password = hashed;
    user.OTP = null;
    user.emailOTP = null;

    await user.save();

    return { message: 'Password reset successfully' };
  }

  async changePassword(
    email: string,
    oldPassword: string,
    newPassword: string,
  ) {
    const user = await this.userModel.findOne({ email });
    if (!user) throw new UnauthorizedException('User not found');
    const match = await bcrypt.compare(oldPassword, user.password);
    if (!match) throw new UnauthorizedException('Invalid credentials');
    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    await user.save();
    return { message: 'Password changed successfully' };
  }

  async deleteUser(
    userId: string,
    deletedBy: string = 'self',
    reason: string = '',
  ): Promise<{ message: string }> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) throw new NotFoundException('User not found');

    const { _id: _deletedId, ...obj } = user.toObject();

    await this.deletedUserModel.create({
      ...obj,
      deletedAt: new Date(),
      deletedBy: deletedBy || null,
      reason: reason || null,
    });

    await this.userModel.findByIdAndDelete(userId).exec();
    return { message: 'User deleted successfully' };
  }

  /**
   * API to verify OTP for email or phone
   * @param identifier - email or phone
   * @param otp - OTP to verify
   * @returns {Promise<{ valid: boolean, message: string }>} - validity and message
   */
  async verifyOtp(
    identifier: string,
    otp: string,
  ): Promise<{ valid: boolean; message: string }> {
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
    const isPhone = /^\+?\d{10,15}$/.test(identifier);
    if (!isEmail && !isPhone) {
      throw new BadRequestException('Invalid email or phone number');
    }
    const query = isEmail ? { email: identifier } : { phone: identifier };
    const user = await this.userModel.findOne(query);
    if (!user) {
      throw new BadRequestException('User not found');
    }
    let valid = false;
    let message = '';
    if (isEmail) {
      valid = user.emailOTP === otp;
      message = valid ? 'Valid OTP for email' : 'Invalid OTP for email';
    } else {
      valid = user.OTP === otp;
      message = valid ? 'Valid OTP for phone' : 'Invalid OTP for phone';
    }
    return { valid, message };
  }

  /**
   * Request OTP for phone login
   * @param phone - phone number
   */
  async requestPhoneLoginOtp(phone: string) {
    const user = await this.userModel.findOne({ phone });
    if (!user) throw new BadRequestException('User not found');
    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now
    user.phoneLoginOTP = otp;
    user.phoneLoginOTPExpiresAt = expiresAt;
    await user.save();
    await this.twilioService.sendSms(
      phone,
      MessageTemplates.verificationCode(otp),
    );
    return { message: 'OTP sent to phone' };
  }

  /**
   * Verify OTP for phone login and issue JWT
   * @param phone - phone number
   * @param otp - OTP
   */
  async verifyPhoneLoginOtp(phone: string, otp: string) {
    const user = await this.userModel.findOne({ phone });
    if (!user) throw new BadRequestException('User not found');
    if (!user.phoneLoginOTP || !user.phoneLoginOTPExpiresAt) {
      throw new BadRequestException('No OTP requested');
    }
    if (user.phoneLoginOTP !== otp) {
      throw new BadRequestException('Invalid OTP');
    }
    if (user.phoneLoginOTPExpiresAt.getTime() < Date.now()) {
      throw new BadRequestException('OTP expired');
    }
    // Invalidate OTP after use
    user.phoneLoginOTP = null;
    user.phoneLoginOTPExpiresAt = null;
    await user.save();
    const token = this.jwtService.sign({ uid: String(user._id) });
    user.password = '';
    return { token, user };
  }
}

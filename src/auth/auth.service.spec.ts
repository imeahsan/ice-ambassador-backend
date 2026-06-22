import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { User } from '../schemas/user.schema';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { UnauthorizedException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { EmailService } from '../common/email/email.service';

describe('AuthService - Login', () => {
  let service: AuthService;
  let userModel: any;
  let jwtService: any;
  let emailService: any;

  const mockUserInstance = (overrides = {}) => {
    const user = {
      _id: 'user123',
      email: 'test@example.com',
      password: 'hashed_password',
      firstName: 'John',
      lastName: 'Doe',
      userType: 'AMBASSADOR',
      status: 'ACTIVE',
      isMigrated: false,
      lastLoginAt: null,
      resetTokens: [] as any[],
      emailVerifiedAt: null as Date | null,
      emailVerificationTokens: [] as any[],
      save: jest.fn().mockResolvedValue(true),
      toObject: function() {
        return { ...this };
      },
      ...overrides,
    };
    user.save = jest.fn().mockImplementation(async function() {
      return this;
    });
    return user;
  };

  beforeEach(async () => {
    userModel = {
      findOne: jest.fn(),
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('signed_jwt_token'),
    };

    emailService = {
      sendPasswordResetEmail: jest.fn().mockResolvedValue({ MessageId: 'msg123' }),
      sendVerificationEmail: jest.fn().mockResolvedValue({ MessageId: 'msg123' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getModelToken(User.name),
          useValue: userModel,
        },
        {
          provide: JwtService,
          useValue: jwtService,
        },
        {
          provide: EmailService,
          useValue: emailService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'JWT_EXPIRES_IN') return '15m';
              if (key === 'JWT_REFRESH_EXPIRES_IN') return '7d';
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should successfully log in and return tokens + user without password', async () => {
    const userInstance = mockUserInstance();
    userModel.findOne.mockResolvedValue(userInstance);
    jest.spyOn(bcrypt, 'compare').mockImplementation(async () => true);

    const result = await service.login({
      email: 'TEST@example.com',
      password: 'correct_password',
    });

    expect(userModel.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
    expect(bcrypt.compare).toHaveBeenCalledWith('correct_password', 'hashed_password');
    expect(userInstance.save).toHaveBeenCalled();
    expect(userInstance.lastLoginAt).toBeInstanceOf(Date);
    expect(result.tokens).toEqual({
      accessToken: 'signed_jwt_token',
      refreshToken: 'signed_jwt_token',
    });
    expect(result.user).not.toHaveProperty('password');
    expect(result.user.email).toBe('test@example.com');
  });

  it('should throw 401 when user is not found', async () => {
    userModel.findOne.mockResolvedValue(null);

    await expect(
      service.login({
        email: 'nonexistent@example.com',
        password: 'any_password',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should throw 401 when password does not match', async () => {
    const userInstance = mockUserInstance();
    userModel.findOne.mockResolvedValue(userInstance);
    jest.spyOn(bcrypt, 'compare').mockImplementation(async () => false);

    await expect(
      service.login({
        email: 'test@example.com',
        password: 'wrong_password',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should throw 401 and "Account is not active" if status is not ACTIVE (e.g. SUSPENDED)', async () => {
    const userInstance = mockUserInstance({ status: 'SUSPENDED' });
    userModel.findOne.mockResolvedValue(userInstance);
    jest.spyOn(bcrypt, 'compare').mockImplementation(async () => true);

    await expect(
      service.login({
        email: 'test@example.com',
        password: 'correct_password',
      }),
    ).rejects.toThrow(new UnauthorizedException('Account is not active'));
  });

  it('should throw 403 and PASSWORD_RESET_REQUIRED if status is PASSWORD_RESET_REQUIRED', async () => {
    const userInstance = mockUserInstance({ status: 'PASSWORD_RESET_REQUIRED' });
    userModel.findOne.mockResolvedValue(userInstance);

    try {
      await service.login({
        email: 'migrated@example.com',
        password: 'any_password',
      });
      fail('Should have thrown ForbiddenException');
    } catch (error) {
      expect(error).toBeInstanceOf(ForbiddenException);
      const res: any = error.getResponse();
      expect(res.code).toBe('PASSWORD_RESET_REQUIRED');
    }
  });

  it('should throw 403 and PASSWORD_RESET_REQUIRED if isMigrated is true', async () => {
    const userInstance = mockUserInstance({ isMigrated: true });
    userModel.findOne.mockResolvedValue(userInstance);

    try {
      await service.login({
        email: 'migrated@example.com',
        password: 'any_password',
      });
      fail('Should have thrown ForbiddenException');
    } catch (error) {
      expect(error).toBeInstanceOf(ForbiddenException);
      const res: any = error.getResponse();
      expect(res.code).toBe('PASSWORD_RESET_REQUIRED');
    }
  });

  it('should throw 403 and PASSWORD_RESET_REQUIRED if password field is empty', async () => {
    const userInstance = mockUserInstance({ password: '' });
    userModel.findOne.mockResolvedValue(userInstance);

    try {
      await service.login({
        email: 'migrated@example.com',
        password: 'any_password',
      });
      fail('Should have thrown ForbiddenException');
    } catch (error) {
      expect(error).toBeInstanceOf(ForbiddenException);
      const res: any = error.getResponse();
      expect(res.code).toBe('PASSWORD_RESET_REQUIRED');
    }
  });

  describe('forgotPassword', () => {
    it('should return generic success message even if user does not exist', async () => {
      userModel.findOne.mockResolvedValue(null);

      const result = await service.forgotPassword({ email: 'nonexistent@example.com' });

      expect(result).toEqual({
        message: 'If that email exists, a reset link has been sent',
      });
      expect(userModel.findOne).toHaveBeenCalledWith({ email: 'nonexistent@example.com' });
    });

    it('should generate a token, save its hash on user, send email, and return generic success message if user exists', async () => {
      const userInstance = mockUserInstance({ resetTokens: [] });
      userModel.findOne.mockResolvedValue(userInstance);

      const result = await service.forgotPassword({ email: 'test@example.com' });

      expect(result).toEqual({
        message: 'If that email exists, a reset link has been sent',
      });
      expect(userInstance.save).toHaveBeenCalled();
      expect(userInstance.resetTokens.length).toBe(1);
      expect(userInstance.resetTokens[0].tokenHash).toBeDefined();
      expect(userInstance.resetTokens[0].used).toBe(false);
      expect(userInstance.resetTokens[0].expiresAt).toBeInstanceOf(Date);
      expect(emailService.sendPasswordResetEmail).toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('should throw BadRequestException if token is invalid (no matching user)', async () => {
      userModel.findOne.mockResolvedValue(null);

      await expect(
        service.resetPassword({ token: 'invalid_token', newPassword: 'newPassword123' }),
      ).rejects.toThrow(new BadRequestException('Invalid or expired reset token'));
    });

    it('should throw BadRequestException if token is expired', async () => {
      const expiredDate = new Date();
      expiredDate.setHours(expiredDate.getHours() - 2); // 2 hours ago

      const userInstance = mockUserInstance({
        resetTokens: [
          {
            tokenHash: crypto.createHash('sha256').update('expired_token').digest('hex'),
            expiresAt: expiredDate,
            used: false,
          },
        ],
      });
      userModel.findOne.mockResolvedValue(userInstance);

      await expect(
        service.resetPassword({ token: 'expired_token', newPassword: 'newPassword123' }),
      ).rejects.toThrow(new BadRequestException('Invalid or expired reset token'));
    });

    it('should throw BadRequestException if token has already been used', async () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 1);

      const userInstance = mockUserInstance({
        resetTokens: [
          {
            tokenHash: crypto.createHash('sha256').update('used_token').digest('hex'),
            expiresAt: futureDate,
            used: true,
          },
        ],
      });
      userModel.findOne.mockResolvedValue(userInstance);

      await expect(
        service.resetPassword({ token: 'used_token', newPassword: 'newPassword123' }),
      ).rejects.toThrow(new BadRequestException('Invalid or expired reset token'));
    });

    it('should reset password, invalidate all tokens, clear PASSWORD_RESET_REQUIRED and isMigrated flags, and save user', async () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 1);
      const tokenHashVal = crypto.createHash('sha256').update('valid_token').digest('hex');

      const userInstance = mockUserInstance({
        status: 'PASSWORD_RESET_REQUIRED',
        isMigrated: true,
        resetTokens: [
          {
            tokenHash: tokenHashVal,
            expiresAt: futureDate,
            used: false,
          },
          {
            tokenHash: 'some_other_hash',
            expiresAt: futureDate,
            used: false,
          },
        ],
      });
      userModel.findOne.mockResolvedValue(userInstance);
      jest.spyOn(bcrypt, 'hash').mockImplementation(async () => 'new_hashed_password');

      const result = await service.resetPassword({ token: 'valid_token', newPassword: 'newPassword123' });

      expect(result).toEqual({
        message: 'Password has been reset successfully',
      });
      expect(userInstance.password).toBe('new_hashed_password');
      expect(userInstance.status).toBe('ACTIVE');
      expect(userInstance.isMigrated).toBe(false);
      expect(userInstance.resetTokens[0].used).toBe(true);
      expect(userInstance.resetTokens[1].used).toBe(true);
      expect(userInstance.save).toHaveBeenCalled();
    });
  });

  describe('register', () => {
    it('should generate verification token, hash it on user, save user, send email, and return tokens + user', async () => {
      const mockUser = {
        _id: 'user123',
        email: 'test@example.com',
        phone: '1234567890',
        password: 'hashed_password',
        firstName: 'John',
        lastName: 'Doe',
        userType: 'AMBASSADOR',
        status: 'ACTIVE',
        referralCode: 'ICE-JOHNABCD',
        emailVerificationTokens: [] as any[],
        toObject: function() {
          return { ...this };
        },
        save: jest.fn().mockImplementation(async function() {
          return this;
        }),
      };

      const mockConstructor = jest.fn().mockImplementation(() => mockUser);
      (mockConstructor as any).findOne = jest.fn().mockResolvedValue(null);

      const originalUserModel = service['userModel'];
      service['userModel'] = mockConstructor as any;

      const result = await service.register({
        email: 'test@example.com',
        phone: '1234567890',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        userType: 'AMBASSADOR',
      });

      expect(result.user).toBeDefined();
      expect(mockUser.emailVerificationTokens.length).toBe(1);
      expect(mockUser.emailVerificationTokens[0].tokenHash).toBeDefined();
      expect(emailService.sendVerificationEmail).toHaveBeenCalledWith('test@example.com', expect.any(String));

      service['userModel'] = originalUserModel;
    });
  });

  describe('verifyEmail', () => {
    it('should throw BadRequestException if verification token does not match any user', async () => {
      userModel.findOne.mockResolvedValue(null);

      await expect(
        service.verifyEmail({ token: 'invalid_token' }),
      ).rejects.toThrow(new BadRequestException('Invalid or expired verification token'));
    });

    it('should return already verified message if user email is already verified', async () => {
      const userInstance = mockUserInstance({ emailVerifiedAt: new Date() });
      userModel.findOne.mockResolvedValue(userInstance);

      const result = await service.verifyEmail({ token: 'any_token' });

      expect(result).toEqual({
        message: 'Email is already verified',
      });
      expect(userInstance.save).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if verification token is expired', async () => {
      const expiredDate = new Date();
      expiredDate.setHours(expiredDate.getHours() - 2); // 2 hours ago

      const userInstance = mockUserInstance({
        emailVerifiedAt: null,
        emailVerificationTokens: [
          {
            tokenHash: crypto.createHash('sha256').update('expired_token').digest('hex'),
            expiresAt: expiredDate,
            used: false,
          },
        ],
      });
      userModel.findOne.mockResolvedValue(userInstance);

      await expect(
        service.verifyEmail({ token: 'expired_token' }),
      ).rejects.toThrow(new BadRequestException('Invalid or expired verification token'));
    });

    it('should throw BadRequestException if verification token is already used', async () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 1);

      const userInstance = mockUserInstance({
        emailVerifiedAt: null,
        emailVerificationTokens: [
          {
            tokenHash: crypto.createHash('sha256').update('used_token').digest('hex'),
            expiresAt: futureDate,
            used: true,
          },
        ],
      });
      userModel.findOne.mockResolvedValue(userInstance);

      await expect(
        service.verifyEmail({ token: 'used_token' }),
      ).rejects.toThrow(new BadRequestException('Invalid or expired verification token'));
    });

    it('should verify email, set emailVerifiedAt, invalidate tokens and save user on valid token', async () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 1);
      const tokenHashVal = crypto.createHash('sha256').update('123456').digest('hex');

      const userInstance = mockUserInstance({
        emailVerifiedAt: null,
        emailVerificationTokens: [
          {
            tokenHash: tokenHashVal,
            expiresAt: futureDate,
            used: false,
          },
          {
            tokenHash: 'other_token_hash',
            expiresAt: futureDate,
            used: false,
          },
        ],
      });
      userModel.findOne.mockResolvedValue(userInstance);

      const result = await service.verifyEmail({ token: '123456' });

      expect(result).toEqual({
        message: 'Email verified successfully',
      });
      expect(userInstance.emailVerifiedAt).toBeInstanceOf(Date);
      expect((userInstance.emailVerificationTokens as any)[0].used).toBe(true);
      expect((userInstance.emailVerificationTokens as any)[1].used).toBe(true);
      expect(userInstance.save).toHaveBeenCalled();
    });
  });

  describe('resendVerification', () => {
    it('should return generic success message even if user does not exist', async () => {
      userModel.findOne.mockResolvedValue(null);

      const result = await service.resendVerification({ email: 'nonexistent@example.com' });

      expect(result).toEqual({
        message: 'If that email exists, a verification code has been sent',
      });
      expect(userModel.findOne).toHaveBeenCalledWith({ email: 'nonexistent@example.com' });
    });

    it('should return already verified message if user is already verified', async () => {
      const userInstance = mockUserInstance({ emailVerifiedAt: new Date() });
      userModel.findOne.mockResolvedValue(userInstance);

      const result = await service.resendVerification({ email: 'verified@example.com' });

      expect(result).toEqual({
        message: 'Email is already verified',
      });
      expect(userInstance.save).not.toHaveBeenCalled();
    });

    it('should invalidate old tokens, generate and save new verification token, send email and return success if user exists and unverified', async () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 1);

      const userInstance = mockUserInstance({
        emailVerifiedAt: null,
        emailVerificationTokens: [
          {
            tokenHash: 'old_hash',
            expiresAt: futureDate,
            used: false,
          },
        ],
      });
      userModel.findOne.mockResolvedValue(userInstance);

      const result = await service.resendVerification({ email: 'unverified@example.com' });

      expect(result).toEqual({
        message: 'If that email exists, a verification code has been sent',
      });
      expect(userInstance.save).toHaveBeenCalled();
      expect((userInstance.emailVerificationTokens as any)[0].used).toBe(true);
      expect(userInstance.emailVerificationTokens?.length).toBe(2);
      expect((userInstance.emailVerificationTokens as any)[1].tokenHash).toBeDefined();
      expect((userInstance.emailVerificationTokens as any)[1].used).toBe(false);
      expect(emailService.sendVerificationEmail).toHaveBeenCalled();
    });
  });
});

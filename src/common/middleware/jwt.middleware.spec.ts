import { Test, TestingModule } from '@nestjs/testing';
import { JwtMiddleware } from './jwt.middleware';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ApiKeysService } from '../../modules/api-keys/api-keys.service';
import { UserService } from '../../modules/user/user.service';
import { Request, Response } from 'express';

describe('JwtMiddleware', () => {
  let middleware: JwtMiddleware;
  let jwtService: any;
  let apiKeysService: any;
  let userService: any;
  let configService: any;

  beforeEach(async () => {
    jwtService = {
      verify: jest.fn(),
      sign: jest.fn(),
    };
    apiKeysService = {
      validate: jest.fn(),
    };
    userService = {
      findById: jest.fn(),
    };
    configService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'JWT_EXPIRES_IN') return '15m';
        return '1d';
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtMiddleware,
        { provide: JwtService, useValue: jwtService },
        { provide: ApiKeysService, useValue: apiKeysService },
        { provide: UserService, useValue: userService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    middleware = module.get<JwtMiddleware>(JwtMiddleware);
  });

  const mockRequest = (headers = {}, body = {}, query = {}) => {
    return {
      headers,
      body,
      query,
    } as unknown as Request;
  };

  const mockResponse = () => {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.setHeader = jest.fn();
    return res as unknown as Response;
  };

  it('should pass API Key verification and set user if key is valid and user exists', async () => {
    const req = mockRequest({ 'x-api-key': 'valid-key' });
    const res = mockResponse();
    const next = jest.fn();

    apiKeysService.validate.mockResolvedValue({ userId: 'user123' });
    userService.findById.mockResolvedValue({ _id: 'user123', email: 'api@example.com', userType: 'PARTNER' });

    await middleware.use(req, res, next);

    expect(apiKeysService.validate).toHaveBeenCalledWith('valid-key');
    expect(userService.findById).toHaveBeenCalledWith('user123');
    expect(req['userId']).toBe('user123');
    expect(req['user']).toEqual({ userId: 'user123', email: 'api@example.com', userType: 'PARTNER' });
    expect(next).toHaveBeenCalled();
  });

  it('should return 401 if access token header is missing', async () => {
    const req = mockRequest();
    const res = mockResponse();
    const next = jest.fn();

    await middleware.use(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Unauthorized: Missing authorization header' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 if authorization header format is invalid', async () => {
    const req = mockRequest({ authorization: 'InvalidFormat token' });
    const res = mockResponse();
    const next = jest.fn();

    await middleware.use(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Unauthorized: Invalid token format' });
  });

  it('should attach user details to request and call next if access token is valid', async () => {
    const req = mockRequest({ authorization: 'Bearer valid_token' });
    const res = mockResponse();
    const next = jest.fn();

    jwtService.verify.mockReturnValue({ uid: 'user123', email: 'user@example.com', userType: 'AMBASSADOR' });

    await middleware.use(req, res, next);

    expect(jwtService.verify).toHaveBeenCalledWith('valid_token');
    expect(req['userId']).toBe('user123');
    expect(req['user']).toEqual({ userId: 'user123', email: 'user@example.com', userType: 'AMBASSADOR' });
    expect(next).toHaveBeenCalled();
  });

  it('should return 401 if access token is expired and no refresh token is provided', async () => {
    const req = mockRequest({ authorization: 'Bearer expired_token' });
    const res = mockResponse();
    const next = jest.fn();

    const expiredError = new Error('Jwt expired');
    expiredError.name = 'TokenExpiredError';
    jwtService.verify.mockImplementation((token: string) => {
      if (token === 'expired_token') throw expiredError;
      throw new Error('invalid');
    });

    await middleware.use(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Unauthorized: Access token expired' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should issue new access token, set header, set req.user, and call next if access token is expired but refresh token is valid', async () => {
    const req = mockRequest(
      { authorization: 'Bearer expired_token', 'x-refresh-token': 'valid_refresh_token' }
    );
    const res = mockResponse();
    const next = jest.fn();

    const expiredError = new Error('Jwt expired');
    expiredError.name = 'TokenExpiredError';
    jwtService.verify.mockImplementation((token: string) => {
      if (token === 'expired_token') throw expiredError;
      if (token === 'valid_refresh_token') return { uid: 'user123' };
      throw new Error('invalid');
    });

    userService.findById.mockResolvedValue({
      _id: 'user123',
      email: 'refreshed@example.com',
      userType: 'PARTNER',
      status: 'ACTIVE',
    });

    jwtService.sign.mockReturnValue('new_access_token');

    await middleware.use(req, res, next);

    expect(jwtService.verify).toHaveBeenCalledWith('expired_token');
    expect(jwtService.verify).toHaveBeenCalledWith('valid_refresh_token');
    expect(userService.findById).toHaveBeenCalledWith('user123');
    expect(jwtService.sign).toHaveBeenCalled();
    expect(res.setHeader).toHaveBeenCalledWith('x-new-access-token', 'new_access_token');
    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Expose-Headers', 'x-new-access-token');
    expect(req['user']).toEqual({ userId: 'user123', email: 'refreshed@example.com', userType: 'PARTNER' });
    expect(next).toHaveBeenCalled();
  });
});

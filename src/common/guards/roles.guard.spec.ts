import { Test, TestingModule } from '@nestjs/testing';
import { RequireRole } from './roles.guard';
import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';

describe('RolesGuard', () => {
  const createMockContext = (user: any): ExecutionContext => {
    const req = { user };
    return {
      switchToHttp: () => ({
        getRequest: () => req,
      }),
    } as unknown as ExecutionContext;
  };

  it('should allow user with PARTNER role when requiring PARTNER', () => {
    const GuardClass = RequireRole('PARTNER');
    const guard = new GuardClass();
    const context = createMockContext({ userType: 'PARTNER' });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw ForbiddenException if user does not have PARTNER role when requiring PARTNER', () => {
    const GuardClass = RequireRole('PARTNER');
    const guard = new GuardClass();
    const context = createMockContext({ userType: 'AMBASSADOR' });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context)).toThrow('Insufficient permissions');
  });

  it('should allow user with AMBASSADOR role when requiring AMBASSADOR', () => {
    const GuardClass = RequireRole('AMBASSADOR');
    const guard = new GuardClass();
    const context = createMockContext({ userType: 'AMBASSADOR' });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw ForbiddenException if user does not have AMBASSADOR role when requiring AMBASSADOR', () => {
    const GuardClass = RequireRole('AMBASSADOR');
    const guard = new GuardClass();
    const context = createMockContext({ userType: 'PARTNER' });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should allow either role when requiring BOTH', () => {
    const GuardClass = RequireRole('BOTH');
    const guard = new GuardClass();

    const partnerContext = createMockContext({ userType: 'PARTNER' });
    const ambassadorContext = createMockContext({ userType: 'AMBASSADOR' });

    expect(guard.canActivate(partnerContext)).toBe(true);
    expect(guard.canActivate(ambassadorContext)).toBe(true);
  });

  it('should throw ForbiddenException when requiring BOTH and user has invalid role', () => {
    const GuardClass = RequireRole('BOTH');
    const guard = new GuardClass();
    const context = createMockContext({ userType: 'OTHER' });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should throw UnauthorizedException if req.user is missing', () => {
    const GuardClass = RequireRole('PARTNER');
    const guard = new GuardClass();
    const context = createMockContext(undefined);

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });
});

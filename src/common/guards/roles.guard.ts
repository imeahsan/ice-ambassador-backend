import { CanActivate, ExecutionContext, Injectable, mixin, Type, ForbiddenException, UnauthorizedException } from '@nestjs/common';

export const RequireRole = (role: 'PARTNER' | 'AMBASSADOR' | 'BOTH'): Type<CanActivate> => {
    @Injectable()
    class RoleGuard implements CanActivate {
        canActivate(context: ExecutionContext): boolean {
            const request = context.switchToHttp().getRequest();
            const user = request.user;
            if (!user) {
                throw new UnauthorizedException('Unauthorized');
            }

            const userType = user.userType;
            let hasRole = false;

            if (role === 'BOTH') {
                if (userType === 'PARTNER' || userType === 'AMBASSADOR') {
                    hasRole = true;
                }
            } else {
                if (userType === role) {
                    hasRole = true;
                }
            }

            if (!hasRole) {
                throw new ForbiddenException('Insufficient permissions');
            }

            return true;
        }
    }
    return mixin(RoleGuard);
};

export const requireRole = RequireRole;

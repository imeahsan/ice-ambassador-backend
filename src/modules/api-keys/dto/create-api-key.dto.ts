import { IsString, IsOptional, IsArray, ArrayUnique, IsDateString, IsInt, Min, MaxLength, Matches } from 'class-validator';

// Scope naming convention: segment:segment(:segment)? optionally with * wildcard at end
const SCOPE_REGEX = /^[a-z]+(?::[a-z]+)*(?::\*)?$|^\*$/;

export class CreateApiKeyDto {
 @IsOptional()
  @IsString()
  @MaxLength(64)
  name: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @Matches(SCOPE_REGEX, { each: true, message: 'invalid scope format' })
  scopes?: string[];

  @IsOptional()
  @IsDateString()
  expiresAt?: string; // ISO timestamp

  @IsOptional()
  @IsInt()
  @Min(0)
  rateLimitPerMinute?: number;
}


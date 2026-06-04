import {
    IsEmail,
    IsNotEmpty,
    MinLength,
    MaxLength,
    IsString,
    IsDateString,
    registerDecorator,
    ValidationArguments,
    ValidationOptions,
    ValidatorConstraint,
    ValidatorConstraintInterface,
    IsOptional, IsIn, Matches, IsInt, IsBoolean,
} from 'class-validator';
import {isPhoneNumber} from 'class-validator';
import {Transform} from "class-transformer";

@ValidatorConstraint({name: 'isUSOrPKPhone', async: false})
class IsUSOrPKPhoneConstraint implements ValidatorConstraintInterface {
    validate(phone: string, _args: ValidationArguments) {
        return isPhoneNumber(phone, 'US') || isPhoneNumber(phone, 'PK');
    }

    defaultMessage(_args: ValidationArguments) {
        return 'Phone number must be valid and from US or Pakistan';
    }
}

function IsUSOrPKPhone(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            target: object.constructor,
            propertyName,
            options: validationOptions,
            constraints: [],
            validator: IsUSOrPKPhoneConstraint,
        });
    };
}

export class SignupDto {
    @IsEmail({}, {message: 'Email must be valid'})
    email: string;

    @MinLength(6, {message: 'Password must be at least 6 characters long'})
    @MaxLength(32, {message: 'Password must not exceed 32 characters'})
    @Matches(/^(?=.*[A-Z])(?=.*\d).+$/, {
        message: 'Password must contain at least one uppercase letter and one number',
    })
    password: string;


    @IsNotEmpty({message: 'First name is required'})
    firstname: string;

    @IsNotEmpty({message: 'Last name is required'})
    lastname: string;

    @IsUSOrPKPhone({message: 'Phone number must be valid and from US or Pakistan'})
    phone: string;

    @IsOptional()
    @IsIn(['male', 'female', 'other'], {message: 'Gender must be either male, female, or other'})
    gender: string;

    @IsOptional()
    @IsIn(['car', 'bike', 'scooter','walk'], {message: 'Provide a valid delivery method'})
    deliveryMethod: string;

    @IsOptional()
    @IsDateString({}, {message: 'Date of birth must be a valid date string (YYYY-MM-DD)'})
    dateOfBirth: Date;


    @IsString({message: 'Address must be a string'})
    address: string;

    @Transform(({ value }) => parseInt(value, 10), { toClassOnly: true })
    @IsInt({message: 'zip code must be an integer'})
    zipCode: number;


    @Transform(({ value }) => Boolean(value), { toClassOnly: true })
    @IsOptional()
    @IsBoolean()
    isCorporate: boolean;

}

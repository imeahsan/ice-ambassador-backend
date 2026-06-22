import {Injectable, NotFoundException} from '@nestjs/common';
import {InjectModel} from '@nestjs/mongoose';
import {Model} from 'mongoose';
import {User, UserDocument} from "../../schemas/user.schema";
import {SetProfileDTO} from "./dto/setProfile.dto";

@Injectable()
export class UserService {
    constructor(
        @InjectModel(User.name) private userModel: Model<UserDocument>,
    ) {}

    async getProfile(userId: string) {
        const user = await this.userModel.findById(userId)
            .select('-password -__v')
            .lean();
        if (!user) {
            throw new NotFoundException('User not found');
        }

        return user;
    }

    async setProfile(userId: string, data: SetProfileDTO) {
        const update: any = {};

        if (typeof data.firstName !== 'undefined') {
            update.firstName = data.firstName;
        }
        if (typeof data.lastName !== 'undefined') {
            update.lastName = data.lastName;
        }

        const user = await this.userModel.findByIdAndUpdate(userId, update, {new: true})
            .select('-password -__v')
            .lean();
        if (!user) {
            throw new NotFoundException('User not found');
        }

        return user;
    }

    async findById(userId: string): Promise<UserDocument | null> {
        return this.userModel.findById(userId);
    }
}

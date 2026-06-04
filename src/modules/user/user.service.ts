import {Injectable, NotFoundException} from '@nestjs/common';
import {InjectModel} from '@nestjs/mongoose';
import {Model} from 'mongoose';
import {User, UserDocument} from "../../schemas/user.schema";
import {SetProfileDTO} from "./dto/setProfile.dto";
import {Feedback, FeedbackDocument} from '../../schemas/feedback.schema';

@Injectable()
export class UserService {
    constructor(
        @InjectModel(User.name) private userModel: Model<UserDocument>,
        @InjectModel(Feedback.name) private feedbackModel: Model<FeedbackDocument>
    ) {
    }

    async getProfile(userId: string) {
        const user = await this.userModel.findById(userId)
            .select('-password -OTP -emailOTP -__v')
            .lean();
        if (!user) {
            throw new NotFoundException('User not found');
        }

        return user;
    }

    async setProfile(userId: string, data: SetProfileDTO) {
        const update: any = {
            dateOfBirth: data.dob,
            gender: data.gender,
        };

        // Only update these fields if provided, so ID pics are effectively optional
        if (typeof data.profilePic !== 'undefined') {
            update.profilePic = data.profilePic;
        }
        if (typeof data.idPic !== 'undefined') {
            update.idPic = data.idPic;
        }
        if (typeof data.idBackPic !== 'undefined') {
            update.idBackPic = data.idBackPic;
        }

        const user = await this.userModel.findByIdAndUpdate(userId, update, {new: true})
            .select('-password -OTP -emailOTP -__v')
            .lean();
        if (!user) {
            throw new NotFoundException('User not found');
        }

        return user;
    }

    async verifyDriver(userId: string,) {
        // 1. Find the user
        const user = await this.userModel.findById(userId);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        // 2. Update user verification fields
        user.isVerifiedDriver = true;
        user.adminApproval = true;
        user.veriffStatus = 'approved';
        await user.save();



        return {
            message: 'Driver verified successfully',
            // userId: user._id,
            // deliveryMethod,
        };
    }




    async updateDeliveryMethod(userId: string, deliveryMethod: string) {
        // Update user's deliveryMethod
        const user = await this.userModel.findById(userId);
        if (!user) throw new NotFoundException('User not found');

        user.deliveryMethod = deliveryMethod;
        // If the vehicle type is car, scooter or bike then vehicleAdded should be false
        const requiresVehicleDocs = ['car', 'scooter', 'bike'];
        user.vehicleAdded = !requiresVehicleDocs.includes((deliveryMethod || '').toLowerCase());
        await user.save();

        // If driver details exist, update the deliveryMethod there too


        return await this.userModel.findById(userId).select('-password -OTP -emailOTP -__v').lean();
    }
}

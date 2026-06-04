// src/vehicle/vehicle.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {Vehicle, VehicleDocument} from "../../schemas/vehicle.schema";
import {UpdateVehicleDto} from "./dto/updateVehicle.dto";
import {UserDocument} from "../../schemas/user.schema";

@Injectable()
export class VehicleService {
    constructor(
        @InjectModel(Vehicle.name) private vehicleModel: Model<VehicleDocument>,
        @InjectModel('User') private userModel: Model<UserDocument>, // Inject User model
    ) {}

    async findByUserId(userId: string): Promise<Vehicle> {
        const vehicle = await this.vehicleModel.findOne({ userId });
        if (!vehicle) throw new NotFoundException('Vehicle not found');
        return vehicle;
    }

    async updateByUserId(userId: string, dto: UpdateVehicleDto): Promise<Vehicle> {
        const updated = await this.vehicleModel.findOneAndUpdate(
            { userId },
            { $set: dto },
            { new: true, runValidators: true ,upsert: true}
        );
        if (!updated) throw new NotFoundException('Vehicle not found');
        // Update vehicleAdded flag in user schema
        await this.userModel.updateOne(
            { _id: userId },
            { $set: { vehicleAdded: true } }
        );
        return updated;
    }

    async deleteByUserId(userId: string): Promise<boolean> {
        const result = await this.vehicleModel.deleteOne({ userId });
        if (result.deletedCount > 0) {
            await this.userModel.updateOne(
                { _id: userId },
                { $set: { vehicleAdded: false } }
            );
            return true;
        }
        return false;
    }
}
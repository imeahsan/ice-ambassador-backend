import { Schema, Types, model } from 'mongoose';

const WalletSchema = new Schema({
  userId: { type: Types.ObjectId, ref: 'User', required: true, unique: true },
  balance: { type: Number, default: 0 },
  isCorporate: { type: Boolean, default: false },
}, { timestamps: true });

export const Wallet = model('Wallet', WalletSchema);
export { WalletSchema };

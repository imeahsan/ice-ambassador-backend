import { Schema, Types, model } from 'mongoose';

const WalletTransactionSchema = new Schema({
  walletId: { type: Types.ObjectId, ref: 'Wallet', required: true },
  userId: { type: Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  type: { type: String, enum: ['credit', 'debit'], required: true },
  description: { type: String },
  previousBalance: { type: Number, required: true },
  newBalance: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now },
}, { timestamps: true });

export const WalletTransaction = model('WalletTransaction', WalletTransactionSchema);
export { WalletTransactionSchema };

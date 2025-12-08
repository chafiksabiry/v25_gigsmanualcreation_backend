import mongoose, { Schema, Document } from 'mongoose';

export interface ICurrency extends Document {
  code: string;
  name: string;
  symbol: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const currencySchema = new Schema<ICurrency>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      minlength: 3,
      maxlength: 3
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    symbol: {
      type: String,
      required: true,
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
    collection: 'currencies'
  }
);

// Index pour améliorer les performances de recherche
// Note: code field already has unique index from schema definition
currencySchema.index({ name: 1 });
currencySchema.index({ isActive: 1 });

export const Currency = mongoose.model<ICurrency>('Currency', currencySchema);

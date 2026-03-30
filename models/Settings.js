import mongoose from 'mongoose';

const SettingsSchema = new mongoose.Schema({
  restaurantName: { type: String, default: 'BUSHRA Family Restaurant' },
  email: { type: String },
  phone: { type: String },
  address: { type: String },
  billHeader: { type: String },
  billFooter: { type: String },
  gstin: { type: String },
  taxPercentage: { type: Number, default: 5 },
  currency: { type: String, default: 'INR' },
  logoUrl: { type: String },
  containerPrice: { type: Number, default: 0 },
  gravyPrice: { type: Number, default: 0 },
  workingHours: {
    open: String,
    close: String
  }
}, { timestamps: true });

export default mongoose.models.Settings || mongoose.model('Settings', SettingsSchema);

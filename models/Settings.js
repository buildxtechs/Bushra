import mongoose from 'mongoose';

const SettingsSchema = new mongoose.Schema({
  restaurantName: { type: String, default: 'BUSHRA Family Restaurant' },
  email: { type: String },
  phone: { type: String },
  address: { type: String },
  billHeader: { type: String },
  billFooter: { type: String },
  tagline: { type: String, default: 'Halal Certified | Premium Dining' },
  gstin: { type: String },
  taxPercentage: { type: Number, default: 5 },
  currency: { type: String, default: 'INR' },
  logoUrl: { type: String },
  workingHours: {
    open: String,
    close: String
  }
}, { timestamps: true });

export default mongoose.models.Settings || mongoose.model('Settings', SettingsSchema);

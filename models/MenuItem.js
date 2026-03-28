import mongoose from 'mongoose';

const MenuItemSchema = new mongoose.Schema({
  code: { type: String, unique: true, sparse: true },
  name: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true },
  tax: { type: Number, default: 5 },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  image: { type: String },
  isVeg: { type: Boolean, default: true },
  isBestseller: { type: Boolean, default: false },
  isAvailable: { type: Boolean, default: true },
  preparationTime: { type: Number, default: 15 }, // in minutes
  ratings: {
    average: { type: Number, default: 0 },
    count: { type: Number, default: 0 }
  }
}, { timestamps: true });

export default mongoose.models.MenuItem || mongoose.model('MenuItem', MenuItemSchema);

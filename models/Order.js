import mongoose from 'mongoose';

const OrderSchema = new mongoose.Schema({
  orderId: { type: String, unique: true },
  orderType: { type: String, enum: ['dine-in', 'take-away', 'delivery', 'dine_in', 'takeaway'], required: true },
  table: { type: mongoose.Schema.Types.ObjectId, ref: 'Table' },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  customerName: { type: String },
  customerPhone: { type: String },
  items: [{
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    total: { type: Number, required: true },
    specialInstructions: { type: String }
  }],
  subtotal: { type: Number, required: true },
  total: { type: Number, required: true },
  parcelCharges: {
    container: { type: Number, default: 0 },
    containerPrice: { type: Number, default: 0 },
    gravy: { type: Number, default: 0 },
    gravyPrice: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'preparing', 'prepared', 'served', 'completed', 'cancelled'], 
    default: 'pending' 
  },
  paymentStatus: { 
    type: String, 
    enum: ['pending', 'completed', 'paid', 'failed', 'refunded'], 
    default: 'pending' 
  },
  paymentMethod: { type: String, enum: ['cash', 'card', 'upi', 'online', 'digital'] },
  assignedDeliveryPartner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  deliveryAddress: { type: String },
  orderNotes: { type: String },
  orderHistory: [{
    status: String,
    timestamp: { type: Date, default: Date.now },
    note: String
  }]
}, { timestamps: true });

export default mongoose.models.Order || mongoose.model('Order', OrderSchema);

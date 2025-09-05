import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  bookingId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Booking', 
    required: true, 
    index: true 
},
  totalAmount: { 
    type: Number,
    required: true, 
    min: 1
}
}, { timestamps: true });

export default mongoose.model('Payment', paymentSchema);

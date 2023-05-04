const mongoose = require('mongoose');

const RestaurantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a name'],
      unique: true,
      trim: true,
      maxlength: [50, 'Name can not be more than 50 characters'],
    },
    address: {
      type: String,
      required: [true, 'Please add a address'],
    },
    tel: {
      type: String,
    },
    open: {
      type: Number,
      min: 0,
      max: 24,
      required: [true, "Please add a opening hours"],
      default: 8,
    },
    close: {
      type: Number,
      min: 0,
      max: 24,
      required: [true, "Please add a closing hour"],
      default: 16,
    },
  },
  {
    toJSON: {virtuals: true},
    toObject: {virtuals: true},
  }
);

RestaurantSchema.pre('remove', async function (next) {
  console.log(`Reservations being removed from from restaurant ${this._id}`);
  await this.model('Reservation').deleteMany({restaurant: this._id});
  next();
});

RestaurantSchema.virtual('reservations', {
  ref: 'Reservation',
  localField: '_id',
  foreignField: 'restaurant',
  justOne: false,
});

module.exports = mongoose.model('Restaurant', RestaurantSchema);

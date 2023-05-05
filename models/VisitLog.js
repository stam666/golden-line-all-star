const mongoose = require('mongoose');

const VisitLogSchema = new mongoose.Schema({
//   user: {
//     type: mongoose.Schema.ObjectId,
//     ref: 'User',
//   },
  restaurant: {
    type: mongoose.Schema.ObjectId,
    ref: 'Restaurant',
    required: true,
  },
  createAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('VisitLog', VisitLogSchema);

const express = require('express');
const {
  getReserves,
  getReserve,
  addReserve,
  updateReserve,
  deleteReserve,
} = require('../controllers/reserves');
const {protect, authorize} = require('../middleware/auth');

const router = express.Router({mergeParams: true});

router
  .route('/')
  .get(protect, getReserves)
  .post(protect, authorize('admin', 'user'), addReserve);
router
  .route('/:id')
  .get(protect, getReserve)
  .put(protect, authorize('admin', 'user'), updateReserve)
  .delete(protect, authorize('admin', 'user'), deleteReserve);

module.exports = router;

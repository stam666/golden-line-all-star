const Reserve = require('../models/Reserve');
const Restaurant = require('../models/Restaurant');

exports.getReserves = async (req, res, next) => {
  let query;

  if (req.query.role !== 'admin') {
    query = Reserve.find({user: req.user.id}).populate({
      path: 'restaurant',
      select: 'name address tel open close',
    });
  } else {
    query = Reserve.find().populate({
      path: 'restaurant',
      select: 'name address tel open close',
    });
  }

  try {
    const reserves = await query;

    res.status(200).json({
      success: true,
      count: reserves.length,
      data: reserves,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: 'Cannot find Reserve',
    });
  }
};

exports.getReserve = async (req, res, next) => {
  try {
    const reserve = await Reserve.findById(req.params.id).populate({
      path: 'restaurant',
      select: 'name address tel open close',
    });

    if (!reserve) {
      return res.status(404).json({
        success: false,
        message: `No reserve with the id of ${req.parmas.id}`,
      });
    }

    res.status(200).json({
      success: true,
      data: reserve,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: 'Cannot find Reserve',
    });
  }
};

exports.addReserve = async (req, res, next) => {
  try {
    req.body.user = req.user.id;
    const existedReserve = await Reserve.find({user: req.user.id});

    if (existedReserve.length >= 3 && req.user.role !== 'admin') {
      return res.status(400).json({
        success: false,
        message: `The user with ID ${req.user.id} has already made 3 reserves`,
      });
    }

    req.body.restaurant = req.params.restaurantId;

    const restaurant = await Restaurant.findById(req.params.restaurantId);

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: `No restaurant with the id of ${req.params.restaurantId}`,
      });
    }

    const reserve = await Reserve.create(req.body);

    res.status(200).json({success: true, data: reserve});
  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      message: 'Cannot create Reserve',
    });
  }
};

exports.updateReserve = async (req, res, next) => {
  try {
    let reserve = await Reserve.findById(req.params.id);

    if (!reserve) {
      return res.status(404).json({
        success: false,
        message: `No reserve with the id of ${req.params.id}`,
      });
    }

    if (reserve.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({
        success: false,
        message: `User ${req.user.id} is not authorized to update this reserve`,
      });
    }

    reserve = await Reserve.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    res.status(200).json({success: true, data: reserve});
  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      message: 'Cannot update Reserve',
    });
  }
};

exports.deleteReserve = async (req, res, next) => {
  try {
    let reserve = await Reserve.findById(req.params.id);

    if (!reserve) {
      return res.status(404).json({
        success: false,
        message: `No reserve with the id of ${req.params.id}`,
      });
    }

    if (reserve.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({
        success: false,
        message: `User ${req.user.id} is not authorized to delete this reserve`,
      });
    }

    await reserve.remove();

    res.status(200).json({success: true, data: {}});
  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      message: 'Cannot delete Reserve',
    });
  }
};

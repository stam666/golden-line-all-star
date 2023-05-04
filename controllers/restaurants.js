const Restaurant = require('../models/Restaurant.js');

exports.getRestaurants = async (req, res, next) => {
  try {
    let query;

    const reqQuery = {...req.query};
    const removeFields = ['select', 'sort', 'page', 'limit'];
    removeFields.forEach((param) => delete reqQuery[param]);

    let queryStr = JSON.stringify(req.query);
    queryStr = queryStr.replace(
      /\b(gt|gte|lt|lte|in)\b/g,
      (match) => `$${match}`
    );

    query = Restaurant.find(JSON.parse(queryStr)).populate('reservations');

    if (req.query.select) {
      const fields = req.query.select.split(',').join(' ');
      query = query.select(fields);
    }

    if (req.query.sort) {
      const sortBy = req.query.sort.split(',').join(' ');
      query = query.sort(sortBy);
    } else {
      query = query.sort('-createdAt');
    }

    //sponsored sort
    query.sort({isSporsored: -1});

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 25;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Restaurant.countDocuments();

    query = query.skip(startIndex).limit(limit);

    const restaurants = await query;

    const pagination = {};

    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit,
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit,
      };
    }

    res.status(200).json({
      success: true,
      count: restaurants.length,
      pagination,
      data: restaurants,
    });
  } catch (err) {
    res.status(400).json({success: false});
  }
};

exports.getRestaurant = async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) {
      return res.status(400).json({success: false});
    }
    res.status(200).json({success: true, data: restaurant});
  } catch (err) {
    res.status(400).json({success: false});
  }
};

exports.createRestaurant = async (req, res, next) => {
  try {
    const restaurant = await Restaurant.create(req.body);
    res.status(201).json({success: true, data: restaurant});
  } catch (err) {
    console.log(err);
  }
};

exports.updateRestaurant = async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!restaurant) {
      return res.status(400).json({success: false});
    }

    res.status(200).json({success: true, data: restaurant});
  } catch (err) {
    res.status(400).json({success: false});
  }
};

exports.deleteRestaurant = async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);

    if (!restaurant) {
      return res.status(400).json({success: false});
    }

    restaurant.remove();
    res.status(200).json({success: true, data: {}});
  } catch (err) {
    res.status(400).json({success: false});
  }
};

exports.setIsSponsered = async (req, res, next) => {
  try {
    let isSponsored;
    if (req.body.isSporsored === true) {
      isSponsored = true;
    } else if (req.body.isSponsored === false) {
      isSponsored = false;
    } else {
      return res.json({message: 'can be only boolean value'});
    }

    const restaurant = await Restaurant.findByIdAndUpdate(
      req.params.id,
      {isSponsored: req.body.isSponsored},
      {
        new: true,
        runValidators: true,
      }
    );

    if (!restaurant) {
      return res.status(400).json({success: false});
    }

    res.status(200).json({success: true, data: restaurant});
  } catch (err) {
    res.status(400).json({success: false});
  }
};

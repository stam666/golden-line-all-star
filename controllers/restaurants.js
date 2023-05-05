const Restaurant = require('../models/Restaurant.js');
const User = require('../models/User.js');
const VisitLog = require('../models/VisitLog.js');
const mongoose = require('mongoose');
const {Configuration, OpenAIApi} = require('openai');

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
    query.sort({isSponsored: -1});

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

    await VisitLog.create({
      restaurant: req.params.id,
      user: req.body.userID ? req.body.userID : null,
    });

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

exports.getRestaurantStat = async (req, res) => {
  try {
    const restaurantId = req.params.id;
    const allVisitors = await VisitLog.countDocuments({
      restaurant: mongoose.Types.ObjectId(restaurantId),
    });

    const lastMonthVisitors = await VisitLog.countDocuments({
      restaurant: mongoose.Types.ObjectId(restaurantId),
      createdAt: {$gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)},
    });
    const lastWeekVisitors = await VisitLog.countDocuments({
      restaurant: mongoose.Types.ObjectId(restaurantId),
      createdAt: {$gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)},
    });

    const topVisitors = await VisitLog.aggregate([
      {$match: {restaurant: mongoose.Types.ObjectId(restaurantId)}},
      {$group: {_id: '$user', count: {$sum: 1}}},
      {$sort: {count: -1}},
      {$limit: 3},
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      {$unwind: '$user'},
      {$project: {_id: 0, user: {name: 1, email: 1}, count: 1}},
    ]);

    res.json({
      allVisitors,
      lastMonthVisitors,
      lastWeekVisitors,
      topVisitors,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({message: err.message});
  }
};

exports.getAllRestaurantsStat = async (req, res) => {
  try {
    const result = await VisitLog.aggregate([
      {
        $match: {user: {$ne: null}},
      },
      {
        $group: {
          _id: {restaurant: '$restaurant', user: '$user'},
          count: {$sum: 1},
        },
      },
      {$sort: {'_id.restaurant': 1, count: -1}},
      {
        $group: {
          _id: '$_id.restaurant',
          users: {$push: {user: '$_id.user', count: '$count'}},
        },
      },
      {
        $lookup: {
          from: 'restaurants',
          localField: '_id',
          foreignField: '_id',
          as: 'restaurant',
        },
      },
      {$unwind: '$restaurant'},
      {
        $project: {
          _id: 0,
          restaurant: '$restaurant.name',
          users: {$slice: ['$users', 3]},
          totalVisitors: {$sum: '$users.count'},
        },
      },
      {$sort: {totalVisitors: -1}},
    ]);

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({message: err.message});
  }
};

exports.randomMenu = async (req, res, next) => {
  const ingredient = req.body.ingredient;
  try {
    const configuration = new Configuration({
      apiKey: process.env.OPENAI_API_KEY,
    });
    const openai = new OpenAIApi(configuration);
    let conversationLog = [
      {
        role: 'system',
        content:
          'You are a chef chatbot who will recommend the food from ingredient and return into a list of 5 foods (including Thai, Italian, Japanese, Chinese).',
      },
    ];
    conversationLog.push({
      role: 'user',
      content: ingredient,
    });

    const result = await openai
      .createChatCompletion({
        model: 'gpt-3.5-turbo',
        messages: conversationLog,
        max_tokens: 2000, // limit token usage
      })
      .catch((error) => {
        console.log(`OPENAI ERR: ${error}`);
      });
    res
      .status(200)
      .json({success: true, data: result.data.choices[0].message.content});
  } catch (err) {
    console.log(err);
    res.status(400).json({success: false});
  }
};

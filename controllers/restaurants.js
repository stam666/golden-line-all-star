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

const getLast24HoursDateRange = () => {
  const end = new Date();
  const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
  return {start, end};
};

const getLastWeekDateRange = () => {
  const end = new Date();
  const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
  return {start, end};
};

const getLastMonthDateRange = () => {
  const end = new Date();
  const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
  return {start, end};
};

const generateCompleteDataArray = (
  visitorsData,
  startDate,
  endDate,
  groupByHour = false
) => {
  const completeData = [];
  let currentDate = new Date(startDate);
  const visitorsDataMap = new Map(
    visitorsData.map((entry) => [entry._id, entry.count])
  );

  while (currentDate <= endDate) {
    const isoString = currentDate.toISOString();
    const formattedDate = groupByHour
      ? isoString.slice(0, 13) + ':00'
      : isoString.slice(0, 10);

    const count = visitorsDataMap.get(formattedDate) || 0;

    completeData.push({_id: formattedDate, count});

    if (groupByHour) {
      currentDate.setHours(currentDate.getHours() + 1);
    } else {
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  return completeData;
};

const getVisitorsByDateRange = async (
  restaurantId,
  start,
  end,
  groupByHour = false
) => {
  const groupById = groupByHour
    ? {
        $dateToString: {
          format: '%Y-%m-%dT%H:00',
          date: '$createdAt',
          timezone: 'UTC',
        },
      }
    : {
        $dateToString: {
          format: '%Y-%m-%d',
          date: '$createdAt',
          timezone: 'UTC',
        },
      };

  const visitors = await VisitLog.aggregate([
    {
      $match: {
        restaurant: mongoose.Types.ObjectId(restaurantId),
        createdAt: {$gte: start, $lt: end},
      },
    },
    {
      $group: {
        _id: groupById,
        count: {$sum: 1},
      },
    },
    {$sort: {_id: 1}},
  ]);

  const completeVisitorsData = generateCompleteDataArray(
    visitors,
    start,
    end,
    groupByHour
  );
  return completeVisitorsData;
};

exports.getRestaurantStat = async (req, res) => {
  try {
    const restaurantId = req.params.id;

    const allVisitors = await VisitLog.countDocuments({
      restaurant: mongoose.Types.ObjectId(restaurantId),
    });

    const dailyVisitors = await VisitLog.countDocuments({
      restaurant: mongoose.Types.ObjectId(restaurantId),
      createdAt: {$gte: new Date(Date.now() - 24 * 60 * 60 * 1000)},
    });

    const lastMonthVisitors = await VisitLog.countDocuments({
      restaurant: mongoose.Types.ObjectId(restaurantId),
      createdAt: {$gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)},
    });
    const lastWeekVisitors = await VisitLog.countDocuments({
      restaurant: mongoose.Types.ObjectId(restaurantId),
      createdAt: {$gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)},
    });

    const last24HoursDateRange = getLast24HoursDateRange();
    const lastWeekDateRange = getLastWeekDateRange();
    const lastMonthDateRange = getLastMonthDateRange();

    const last24HoursVisitorsData = await getVisitorsByDateRange(
      restaurantId,
      last24HoursDateRange.start,
      last24HoursDateRange.end,
      true // group data by hour
    );

    const lastWeekVisitorsData = await getVisitorsByDateRange(
      restaurantId,
      lastWeekDateRange.start,
      lastWeekDateRange.end
    );

    const lastMonthVisitorsData = await getVisitorsByDateRange(
      restaurantId,
      lastMonthDateRange.start,
      lastMonthDateRange.end
    );

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
      daily: {
        labels: last24HoursVisitorsData.map((entry) => entry._id),
        data: last24HoursVisitorsData.map((entry) => entry.count),
        count: dailyVisitors,
      },
      weekly: {
        labels: lastWeekVisitorsData.map((entry) => entry._id),
        data: lastWeekVisitorsData.map((entry) => entry.count),
        count: lastWeekVisitors,
      },
      monthly: {
        labels: lastMonthVisitorsData.map((entry) => entry._id),
        data: lastMonthVisitorsData.map((entry) => entry.count),
        count: lastMonthVisitors,
      },
      topVisitors,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({message: err.message});
  }
};

exports.getAllRestaurantsStat = async (req, res) => {
  try {
    const restaurants = await Restaurant.find();
    const allRestaurantsStats = [];
    for (const restaurant of restaurants) {
      const restaurantId = restaurant._id;
      const allVisitors = await VisitLog.countDocuments({
        restaurant: mongoose.Types.ObjectId(restaurantId),
      });

      const dailyVisitors = await VisitLog.countDocuments({
        restaurant: mongoose.Types.ObjectId(restaurantId),
        createdAt: {$gte: new Date(Date.now() - 24 * 60 * 60 * 1000)},
      });

      const lastMonthVisitors = await VisitLog.countDocuments({
        restaurant: mongoose.Types.ObjectId(restaurantId),
        createdAt: {$gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)},
      });
      const lastWeekVisitors = await VisitLog.countDocuments({
        restaurant: mongoose.Types.ObjectId(restaurantId),
        createdAt: {$gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)},
      });

      const last24HoursDateRange = getLast24HoursDateRange();
      const lastWeekDateRange = getLastWeekDateRange();
      const lastMonthDateRange = getLastMonthDateRange();

      const last24HoursVisitorsData = await getVisitorsByDateRange(
        restaurantId,
        last24HoursDateRange.start,
        last24HoursDateRange.end,
        true // group data by hour
      );

      const lastWeekVisitorsData = await getVisitorsByDateRange(
        restaurantId,
        lastWeekDateRange.start,
        lastWeekDateRange.end
      );

      const lastMonthVisitorsData = await getVisitorsByDateRange(
        restaurantId,
        lastMonthDateRange.start,
        lastMonthDateRange.end
      );

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
      allRestaurantsStats.push({
        name: restaurant.name,
        statistics: {
          allVisitors,
          daily: {
            labels: last24HoursVisitorsData.map((entry) => entry._id),
            data: last24HoursVisitorsData.map((entry) => entry.count),
            count: dailyVisitors,
          },
          weekly: {
            labels: lastWeekVisitorsData.map((entry) => entry._id),
            data: lastWeekVisitorsData.map((entry) => entry.count),
            count: lastWeekVisitors,
          },
          monthly: {
            labels: lastMonthVisitorsData.map((entry) => entry._id),
            data: lastMonthVisitorsData.map((entry) => entry.count),
            count: lastMonthVisitors,
          },
          topVisitors,
        },
      });
    }
    res.json(allRestaurantsStats);
  } catch (err) {
    console.error(err);
    res.status(500).json({message: err.message});
  }
};

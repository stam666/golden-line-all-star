const Appointment = require('../models/Appointment');
const Restaurant = require('../models/Restaurant');

exports.getAppointments = async (req, res, next) => {
  let query;

  if (req.query.role !== 'admin') {
    query = Appointment.find({user: req.user.id}).populate({
      path: 'restaurant',
      select: 'name tel open close',
    });
  } else {
    query = Appointment.find().populate({
      path: 'restaurant',
      select: 'name tel open close',
    });
  }

  try {
    const appointments = await query;

    res.status(200).json({
      success: true,
      count: appointments.length,
      data: appointments,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: 'Cannot find Appointment',
    });
  }
};

exports.getAppointment = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id).populate({
      path: 'restaurant',
      select: 'name tel open close',
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: `No appointment with the id of ${req.parmas.id}`,
      });
    }

    res.status(200).json({
      success: true,
      data: appointment,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: 'Cannot find Appointment',
    });
  }
};

exports.addAppointment = async (req, res, next) => {
  try {
    req.body.user = req.user.id;
    const existedAppointment = await Appointment.find({user: req.user.id});

    if (existedAppointment.length >= 3 && req.user.role !== 'admin') {
      return res.status(400).json({
        success: false,
        message: `The user with ID ${req.user.id} has already made 3 appointments`,
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

    const appointment = await Appointment.create(req.body);

    res.status(200).json({success: true, data: appointment});
  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      message: 'Cannot create Appointment',
    });
  }
};

exports.updateAppointment = async (req, res, next) => {
  try {
    let appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: `No appointment with the id of ${req.params.id}`,
      });
    }

    if (appointment.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({
        success: false,
        message: `User ${req.user.id} is not authorized to update this appointment`,
      });
    }

    appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    res.status(200).json({success: true, data: appointment});
  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      message: 'Cannot update Appointment',
    });
  }
};

exports.deleteAppointment = async (req, res, next) => {
  try {
    let appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: `No appointment with the id of ${req.params.id}`,
      });
    }

    if (appointment.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({
        success: false,
        message: `User ${req.user.id} is not authorized to delete this appointment`,
      });
    }

    await appointment.remove();

    res.status(200).json({success: true, data: {}});
  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      message: 'Cannot delete Appointment',
    });
  }
};

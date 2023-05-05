const express = require('express');
const {
  getRestaurants,
  getRestaurant,
  createRestaurant,
  updateRestaurant,
  deleteRestaurant,
  setIsSponsered,
  randomMenu,
  getRestaurantStat,
  getAllRestaurantsStat,
  getOverallRestaurantsStat,
} = require('../controllers/restaurants');
const {protect, authorize} = require('../middleware/auth');

const router = express.Router();
const reservationRouter = require('./reservations');

router.use('/:restaurantId/reservations', reservationRouter);
router
  .route('/')
  .get(getRestaurants) //
  .post(protect, authorize('admin'), createRestaurant);
router
  .route('/stats/:id')
  .get(protect, authorize('admin'), getRestaurantStat);
router
  .route('/overall-stats')
  .get(protect, authorize('admin'), getOverallRestaurantsStat);
router.route('/stats').get(protect, authorize('admin'), getAllRestaurantsStat);
router
  .route('/:id')
  .get(getRestaurant) //
  .put(protect, authorize('admin'), updateRestaurant)
  .delete(protect, authorize('admin'), deleteRestaurant)
  .patch(protect, authorize('admin'), setIsSponsered);
router.route('/menu').post(protect, randomMenu);

module.exports = router;

/**
 * @swagger
 * components:
 *   schemas:
 *     Restaurant:
 *       type: object
 *       required:
 *         - name
 *         - address
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: The auto-generated id of the restaurant
 *           example: d290f1ee-6c54-4b01-90e6-d701748f0851
 *         name:
 *           type: string
 *           description: Restaurant name
 *         address:
 *           type: string
 *           description: House No., Street, Road
 *         tel:
 *           type: string
 *           description: telephone number
 *         open:
 *           type: number
 *           description: opening hour
 *         close:
 *           type: number
 *           description: closing hour
 *       example:
 *         id: 609bda561452242d88d36e37
 *         name: Happy Restaurant
 *         address: 121 ถ.สุขุมวิท
 *         tel: '0812345678'
 *         open: 8
 *         close: 16
 */
/**
 * @swagger
 * tags:
 *   name: Restaurants
 *   description: The restaurants managing API
 */
/**
 * @swagger
 * /restaurants:
 *   get:
 *     summary: Returns the list of all the restaurants
 *     tags: [Restaurants]
 *     responses:
 *       200:
 *         description: The list of the restaurants
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Restaurant'
 */
/**
 * @swagger
 * /restaurants/{id}:
 *   get:
 *     summary: Get the restaurant by id
 *     tags: [Restaurants]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The restaurant id
 *     responses:
 *       200:
 *         description: The restaurant description by id
 *         contents:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Restaurant'
 *       404:
 *         description: The restaurant was not found
 */
/**
 * @swagger
 * /restaurants:
 *   post:
 *     summary: Create a new restaurant
 *     tags: [Restaurants]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Restaurant'
 *     responses:
 *       201:
 *         description: The restaurant was successfully created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Restaurant'
 *       500:
 *         description: Some server error
 */
/**
 * @swagger
 * /restaurants/{id}:
 *   put:
 *     summary: Update the restaurant by the id
 *     tags: [Restaurants]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The restaurant id
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Restaurant'
 *     responses:
 *       200:
 *         description: The restaurant was updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Restaurant'
 *       404:
 *         description: The restaurant was not found
 *       500:
 *         description: Some error happened
 */
/**
 * @swagger
 * /restaurants/{id}:
 *   delete:
 *     summary: Remove the restaurant by id
 *     tags: [Restaurants]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The restaurant id
 *
 *     responses:
 *       200:
 *         description: The restaurant was deleted
 *       404:
 *         description: The restaurant was not found
 */
/**
 * @swagger
 * /restaurants/{id}:
 *   patch:
 *     summary: set isSponsored by id
 *     tags: [Restaurants]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The restaurant id
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isSponsored
 *             properties:
 *               isSponsored:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: The restaurant was deleted
 *       404:
 *         description: The restaurant was not found
 */

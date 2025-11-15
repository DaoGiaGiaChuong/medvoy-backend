const express = require('express');
const EstimateService = require('../services/EstimateService');

const router = express.Router();

// POST /api/estimate - Get cost estimate for medical procedure
router.post('/', async (req, res) => {
  try {
    const {
      procedure,
      country,
      travelDate,
      budget,
      companions = 1,
      hotelType = 'standard'
    } = req.body;

    // Validate required fields
    if (!procedure || !country) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Procedure and country are required'
      });
    }

    // Validate hotel type
    if (!['budget', 'standard', 'premium'].includes(hotelType)) {
      return res.status(400).json({
        error: 'Invalid hotel type',
        message: 'Hotel type must be budget, standard, or premium'
      });
    }

    const estimateService = new EstimateService(req.db);
    const result = await estimateService.calculateEstimate({
      procedure,
      country,
      travelDate,
      budget,
      companions,
      hotelType
    });

    res.json(result);
  } catch (error) {
    console.error('Estimate calculation error:', error);
    res.status(500).json({
      error: 'Failed to calculate estimate',
      message: error.message
    });
  }
});

// GET /api/estimate/procedures - Get available procedures
router.get('/procedures', async (req, res) => {
  try {
    const estimateService = new EstimateService(req.db);
    const procedures = await estimateService.getAvailableProcedures();
    res.json(procedures);
  } catch (error) {
    console.error('Error fetching procedures:', error);
    res.status(500).json({
      error: 'Failed to fetch procedures',
      message: error.message
    });
  }
});

// GET /api/estimate/hospitals - Get available hospitals by country
router.get('/hospitals', async (req, res) => {
  try {
    const { country } = req.query;
    
    if (!country) {
      return res.status(400).json({
        error: 'Missing required parameter',
        message: 'Country parameter is required'
      });
    }

    const estimateService = new EstimateService(req.db);
    const hospitals = await estimateService.getHospitalsByCountry(country);
    res.json(hospitals);
  } catch (error) {
    console.error('Error fetching hospitals:', error);
    res.status(500).json({
      error: 'Failed to fetch hospitals',
      message: error.message
    });
  }
});

// GET /api/estimate/history - Get user intake history
router.get('/history', async (req, res) => {
  try {
    const estimateService = new EstimateService(req.db);
    const history = await estimateService.getIntakeHistory();
    res.json(history);
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({
      error: 'Failed to fetch history',
      message: error.message
    });
  }
});

module.exports = router;
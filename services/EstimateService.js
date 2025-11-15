class EstimateService {
  constructor(database) {
    this.db = database;
  }

  async calculateEstimate(requestData) {
    const {
      procedure,
      country,
      travelDate,
      budget,
      companions,
      hotelType
    } = requestData;

    try {
      // 1. Get procedure base costs
      const procedureData = await this.getProcedure(procedure);
      if (!procedureData) {
        throw new Error(`Procedure '${procedure}' not found`);
      }

      // 2. Get suitable hospitals
      const hospitals = await this.getMatchingHospitals(procedure, country);
      if (hospitals.length === 0) {
        throw new Error(`No hospitals found for '${procedure}' in '${country}'`);
      }

      // 3. Calculate costs
      const costBreakdown = await this.calculateCosts(
        procedureData,
        hospitals,
        country,
        companions,
        hotelType
      );

      // 4. Generate hospital recommendations
      const recommendations = this.generateRecommendations(hospitals, procedure);

      // 5. Create final estimate
      const estimate = {
        estimateLow: costBreakdown.totalLow,
        estimateHigh: costBreakdown.totalHigh,
        breakdown: {
          procedureFee: {
            low: costBreakdown.procedureLow,
            high: costBreakdown.procedureHigh
          },
          hospitalFee: {
            low: costBreakdown.hospitalLow,
            high: costBreakdown.hospitalHigh
          },
          surgeonFee: {
            low: costBreakdown.surgeonLow,
            high: costBreakdown.surgeonHigh
          },
          flight: {
            low: costBreakdown.flightLow,
            high: costBreakdown.flightHigh
          },
          hotel: {
            low: costBreakdown.hotelLow,
            high: costBreakdown.hotelHigh
          },
          transport: {
            low: costBreakdown.transportLow,
            high: costBreakdown.transportHigh
          }
        },
        recommendations
      };

      // 6. Save to database
      await this.saveUserIntake({
        ...requestData,
        estimateLow: estimate.estimateLow,
        estimateHigh: estimate.estimateHigh,
        breakdown: estimate.breakdown,
        recommendations
      });

      return estimate;

    } catch (error) {
      console.error('Error in calculateEstimate:', error);
      throw error;
    }
  }

  async getProcedure(procedureName) {
    const sql = `
      SELECT * FROM Procedures 
      WHERE LOWER(name) LIKE LOWER(?) OR LOWER(name) LIKE LOWER(?)
      LIMIT 1
    `;
    const params = [`%${procedureName}%`, `%${procedureName.replace(' ', '%')}%`];
    
    const result = await this.db.get(sql, params);
    return result;
  }

  async getMatchingHospitals(procedure, country) {
    // First try exact match
    let sql = `
      SELECT * FROM Hospitals 
      WHERE LOWER(country) = LOWER(?) 
      AND LOWER(specialties) LIKE LOWER(?)
      ORDER BY rating DESC, price_multiplier ASC
      LIMIT 5
    `;
    
    let params = [country, `%"${procedure}"%`];
    let hospitals = await this.db.query(sql, params);
    
    // If no exact match, try fuzzy matching
    if (hospitals.length === 0) {
      const keywords = procedure.toLowerCase().split(' ');
      const orthopedicKeywords = ['knee', 'hip', 'joint', 'replacement', 'orthopedic'];
      const heartKeywords = ['heart', 'cardiac', 'bypass', 'valve'];
      const dentalKeywords = ['dental', 'teeth', 'implant'];
      const cosmeticKeywords = ['cosmetic', 'plastic', 'surgery'];
      
      let searchKeyword = procedure.toLowerCase();
      
      if (keywords.some(k => orthopedicKeywords.includes(k))) {
        searchKeyword = 'orthopedics';
      } else if (keywords.some(k => heartKeywords.includes(k))) {
        searchKeyword = 'heart surgery';
      } else if (keywords.some(k => dentalKeywords.includes(k))) {
        searchKeyword = 'dental';
      } else if (keywords.some(k => cosmeticKeywords.includes(k))) {
        searchKeyword = 'cosmetic surgery';
      }
      
      sql = `
        SELECT * FROM Hospitals 
        WHERE LOWER(country) = LOWER(?) 
        AND (LOWER(specialties) LIKE LOWER(?) OR LOWER(specialties) LIKE LOWER(?) OR LOWER(name) LIKE LOWER(?))
        ORDER BY rating DESC, price_multiplier ASC
        LIMIT 5
      `;
      
      params = [
        country,
        `%"${searchKeyword}"%`,
        `%"${procedure.toLowerCase()}%"`,
        `%${procedure.toLowerCase()}%`
      ];
      
      hospitals = await this.db.query(sql, params);
    }
    
    // If still no match, just get top hospitals in the country
    if (hospitals.length === 0) {
      sql = `
        SELECT * FROM Hospitals 
        WHERE LOWER(country) = LOWER(?) 
        ORDER BY rating DESC
        LIMIT 5
      `;
      
      hospitals = await this.db.query(sql, [country]);
    }
    
    return hospitals;
  }

  async calculateCosts(procedureData, hospitals, country, companions, hotelType) {
    // Calculate procedure costs with hospital multipliers
    const avgMultiplier = hospitals.reduce((sum, h) => sum + h.price_multiplier, 0) / hospitals.length;
    
    const procedureLow = procedureData.base_cost_low * avgMultiplier;
    const procedureHigh = procedureData.base_cost_high * avgMultiplier;
    
    // Break down procedure fee into hospital and surgeon fees
    const hospitalLow = procedureLow * 0.4;
    const hospitalHigh = procedureHigh * 0.4;
    const surgeonLow = procedureLow * 0.6;
    const surgeonHigh = procedureHigh * 0.6;

    // Get flight costs (using average from major US cities)
    const flightCosts = await this.getFlightCosts(country);
    const flightLow = flightCosts.low * (1 + companions * 0.5); // Additional cost for companions
    const flightHigh = flightCosts.high * (1 + companions * 0.5);

    // Get hotel costs (assuming 7 days stay)
    const hotelNights = 7;
    const hotelCosts = await this.getHotelCosts(country, hotelType);
    const hotelLow = hotelCosts.low * hotelNights * (1 + companions);
    const hotelHigh = hotelCosts.high * hotelNights * (1 + companions);

    // Transport costs (local transportation)
    const transportLow = 200 * (1 + companions * 0.3);
    const transportHigh = 500 * (1 + companions * 0.3);

    const totalLow = procedureLow + flightLow + hotelLow + transportLow;
    const totalHigh = procedureHigh + flightHigh + hotelHigh + transportHigh;

    return {
      procedureLow,
      procedureHigh,
      hospitalLow,
      hospitalHigh,
      surgeonLow,
      surgeonHigh,
      flightLow,
      flightHigh,
      hotelLow,
      hotelHigh,
      transportLow,
      transportHigh,
      totalLow,
      totalHigh
    };
  }

  async getFlightCosts(country) {
    const sql = `
      SELECT AVG(avg_cost_low) as avg_low, AVG(avg_cost_high) as avg_high 
      FROM Flights 
      WHERE LOWER(destination) = LOWER(?)
    `;
    
    const result = await this.db.get(sql, [country]);
    
    if (result && result.avg_low) {
      return { low: result.avg_low, high: result.avg_high };
    }
    
    // Fallback default values
    const defaults = {
      'thailand': { low: 750, high: 1400 },
      'india': { low: 950, high: 1800 },
      'turkey': { low: 700, high: 1300 },
      'mexico': { low: 250, high: 550 }
    };
    
    return defaults[country.toLowerCase()] || { low: 500, high: 1000 };
  }

  async getHotelCosts(country, hotelType) {
    const sql = `
      SELECT AVG(nightly_low) as avg_low, AVG(nightly_high) as avg_high 
      FROM Hotels 
      WHERE LOWER(country) = LOWER(?) AND LOWER(type) = LOWER(?)
    `;
    
    const result = await this.db.get(sql, [country, hotelType]);
    
    if (result && result.avg_low) {
      return { low: result.avg_low, high: result.avg_high };
    }
    
    // Fallback default values
    const defaults = {
      budget: { low: 30, high: 60 },
      standard: { low: 60, high: 120 },
      premium: { low: 150, high: 300 }
    };
    
    return defaults[hotelType] || defaults.standard;
  }

  generateRecommendations(hospitals, procedure) {
    return hospitals.slice(0, 3).map(hospital => {
      let reason = `Specializes in ${procedure} with excellent patient outcomes`;
      
      if (hospital.rating >= 4.7) {
        reason = `Top-rated hospital with ${hospital.rating}/5.0 rating, specializes in ${procedure}`;
      } else if (hospital.price_multiplier <= 0.9) {
        reason = `Cost-effective option with quality care, specializes in ${procedure}`;
      }
      
      return {
        hospital: hospital.name,
        country: hospital.country,
        reason,
        accreditation: hospital.accreditation
      };
    });
  }

  async saveUserIntake(data) {
    const sql = `
      INSERT INTO UserIntakes (
        procedure, country, travelDate, budget, companions, 
        hotelType, estimateLow, estimateHigh, breakdown, recommendations
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
      data.procedure,
      data.country,
      data.travelDate || null,
      data.budget || null,
      data.companions,
      data.hotelType,
      data.estimateLow,
      data.estimateHigh,
      JSON.stringify(data.breakdown),
      JSON.stringify(data.recommendations)
    ];
    
    return await this.db.run(sql, params);
  }

  async getAvailableProcedures() {
    const sql = 'SELECT name, base_cost_low, base_cost_high, recommended_countries FROM Procedures ORDER BY name';
    const procedures = await this.db.query(sql);
    
    return procedures.map(p => ({
      ...p,
      recommended_countries: JSON.parse(p.recommended_countries || '[]')
    }));
  }

  async getHospitalsByCountry(country) {
    const sql = 'SELECT * FROM Hospitals WHERE LOWER(country) = LOWER(?) ORDER BY rating DESC';
    const hospitals = await this.db.query(sql, [country]);
    
    return hospitals.map(h => ({
      ...h,
      specialties: JSON.parse(h.specialties || '[]')
    }));
  }

  async getIntakeHistory(limit = 50) {
    const sql = `
      SELECT * FROM UserIntakes 
      ORDER BY created_at DESC 
      LIMIT ?
    `;
    const intakes = await this.db.query(sql, [limit]);
    
    return intakes.map(intake => ({
      ...intake,
      breakdown: JSON.parse(intake.breakdown || '{}'),
      recommendations: JSON.parse(intake.recommendations || '[]')
    }));
  }
}

module.exports = EstimateService;
/**
 * Data validation utilities for mutual fund tracker
 * Validates holdings, returns, and overall data quality
 */

/**
 * Validate holdings data structure and values
 * @param {Array} holdings - Array of holding objects
 * @returns {Object} Validation result with status and issues
 */
export function validateHoldings(holdings) {
    const issues = [];
    const warnings = [];

    if (!holdings || !Array.isArray(holdings)) {
        return {
            valid: false,
            score: 0,
            issues: ['Holdings data is not an array'],
            warnings: []
        };
    }

    if (holdings.length === 0) {
        return {
            valid: false,
            score: 0,
            issues: ['No holdings data available'],
            warnings: []
        };
    }

    // Check holdings count is realistic (5-100 stocks)
    if (holdings.length < 5) {
        warnings.push(`Unusually low holdings count: ${holdings.length}`);
    } else if (holdings.length > 100) {
        warnings.push(`Unusually high holdings count: ${holdings.length}`);
    }

    // Calculate total allocation
    let totalAllocation = 0;
    let holdingsWithData = 0;
    let holdingsWithReturns = 0;

    holdings.forEach((holding, index) => {
        // Check required fields
        if (!holding.name) {
            issues.push(`Holding #${index + 1} missing name`);
        }

        // Check allocation
        const allocation = parseFloat(holding.allocation);
        if (isNaN(allocation)) {
            issues.push(`Holding "${holding.name}" has invalid allocation`);
        } else if (allocation < 0 || allocation > 100) {
            issues.push(`Holding "${holding.name}" has unrealistic allocation: ${allocation}%`);
        } else {
            totalAllocation += allocation;
            holdingsWithData++;
        }

        // Check if return data exists
        if (holding.return1m !== null && holding.return1m !== undefined && holding.return1m !== '-') {
            holdingsWithReturns++;

            // Validate return values are reasonable
            const return1m = parseFloat(holding.return1m);
            const return1y = parseFloat(holding.return1y);
            const return3y = parseFloat(holding.return3y);

            if (!isNaN(return1m) && (return1m < -100 || return1m > 500)) {
                warnings.push(`Holding "${holding.name}" has extreme 1M return: ${return1m}%`);
            }
            if (!isNaN(return1y) && (return1y < -100 || return1y > 1000)) {
                warnings.push(`Holding "${holding.name}" has extreme 1Y return: ${return1y}%`);
            }
            if (!isNaN(return3y) && (return3y < -100 || return3y > 2000)) {
                warnings.push(`Holding "${holding.name}" has extreme 3Y return: ${return3y}%`);
            }
        }
    });

    // Check total allocation sums to ~100%
    if (holdingsWithData > 0) {
        if (Math.abs(totalAllocation - 100) > 5) {
            issues.push(`Total allocation is ${totalAllocation.toFixed(2)}% (expected ~100%)`);
        } else if (Math.abs(totalAllocation - 100) > 2) {
            warnings.push(`Total allocation is ${totalAllocation.toFixed(2)}% (slightly off from 100%)`);
        }
    }

    // Check return data coverage
    const returnCoverage = holdingsWithData > 0 ? (holdingsWithReturns / holdingsWithData * 100) : 0;
    if (returnCoverage < 50) {
        warnings.push(`Low return data coverage: ${returnCoverage.toFixed(0)}%`);
    }

    // Calculate quality score (0-100)
    let score = 100;
    score -= issues.length * 20; // Each issue -20 points
    score -= warnings.length * 5; // Each warning -5 points
    score = Math.max(0, Math.min(100, score));

    return {
        valid: issues.length === 0,
        score,
        issues,
        warnings,
        stats: {
            totalHoldings: holdings.length,
            totalAllocation: totalAllocation.toFixed(2),
            returnCoverage: returnCoverage.toFixed(0) + '%'
        }
    };
}

/**
 * Validate fund metadata
 * @param {Object} fundData - Fund metadata
 * @returns {Object} Validation result
 */
export function validateFundData(fundData) {
    const issues = [];
    const warnings = [];

    if (!fundData) {
        return {
            valid: false,
            score: 0,
            issues: ['Fund data is missing'],
            warnings: []
        };
    }

    // Check NAV
    const nav = parseFloat(fundData.nav);
    if (isNaN(nav) || nav <= 0) {
        issues.push('Invalid NAV value');
    } else if (nav > 10000) {
        warnings.push(`Unusually high NAV: ₹${nav}`);
    }

    // Check returns
    if (fundData.returns) {
        Object.entries(fundData.returns).forEach(([period, value]) => {
            const returnVal = parseFloat(value);
            if (!isNaN(returnVal)) {
                if (returnVal < -100 || returnVal > 1000) {
                    warnings.push(`Extreme ${period} return: ${returnVal}%`);
                }
            }
        });
    }

    // Calculate score
    let score = 100;
    score -= issues.length * 20;
    score -= warnings.length * 5;
    score = Math.max(0, Math.min(100, score));

    return {
        valid: issues.length === 0,
        score,
        issues,
        warnings
    };
}

/**
 * Get overall data quality assessment
 * @param {Object} validation - Validation results
 * @returns {String} Quality label
 */
export function getQualityLabel(score) {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Good';
    if (score >= 50) return 'Fair';
    if (score >= 25) return 'Poor';
    return 'Very Poor';
}

/**
 * Get quality color for UI display
 * @param {Number} score - Quality score (0-100)
 * @returns {String} Color code
 */
export function getQualityColor(score) {
    if (score >= 90) return '#00e676'; // primary green
    if (score >= 75) return '#4caf50'; // light green
    if (score >= 50) return '#ffa726'; // orange
    if (score >= 25) return '#ff7043'; // deep orange
    return '#f44336'; // red
}

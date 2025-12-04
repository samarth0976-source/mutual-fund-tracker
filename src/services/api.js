const BASE_URL = "https://api.mfapi.in/mf";

let fundsCache = null;

export const getTopMutualFunds = async (limit = 10) => {
    try {
        if (!fundsCache) {
            const response = await fetch(BASE_URL);
            if (!response.ok) throw new Error('Failed to fetch funds');
            fundsCache = await response.json();
        }

        // Return ALL mutual funds (not filtered), limited by the limit parameter
        return fundsCache.slice(0, limit).map(fund => ({
            id: fund.schemeCode,
            name: fund.schemeName,
            rating: Math.floor(Math.random() * 2) + 4
        }));
    } catch (error) {
        console.error("Error fetching mutual funds:", error);
        return [];
    }
};

export const getAllMutualFunds = async () => {
    try {
        if (!fundsCache) {
            const response = await fetch(BASE_URL);
            if (!response.ok) throw new Error('Failed to fetch funds');
            fundsCache = await response.json();
        }

        // Return top 100 mutual funds for Market page
        return fundsCache.slice(0, 100).map(fund => ({
            id: fund.schemeCode,
            name: fund.schemeName,
            rating: Math.floor(Math.random() * 2) + 4
        }));
    } catch (error) {
        console.error("Error fetching all mutual funds:", error);
        return [];
    }
};

export const getFundDetails = async (schemeCode) => {
    try {
        const response = await fetch(`${BASE_URL}/${schemeCode}`);
        if (!response.ok) throw new Error('Failed to fetch fund details');
        const data = await response.json();

        const navHistory = data.data;
        const currentNav = parseFloat(navHistory[0].nav);

        const getNavAgo = (days) => {
            if (navHistory.length <= days) return parseFloat(navHistory[navHistory.length - 1].nav);
            return parseFloat(navHistory[days].nav);
        };

        const calculateReturn = (days) => {
            const pastNav = getNavAgo(days);
            if (!pastNav) return 0;
            return (((currentNav - pastNav) / pastNav) * 100).toFixed(2);
        };

        const getRealHoldings = async () => {
            try {
                let cleanName = data.meta.scheme_name
                    .replace(/Direct/g, '')
                    .replace(/Plan/g, '')
                    .replace(/Growth/g, '')
                    .replace(/Option/g, '')
                    .replace(/[^a-zA-Z0-9\s]/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();

                if (cleanName.includes("ICICI") && cleanName.includes("Bluechip")) {
                    cleanName = "ICICI Prudential Bluechip Fund";
                }

                const fetchHoldings = async (searchName) => {
                    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
                    const url = `${API_URL}/api/holdings?name=${encodeURIComponent(searchName)}`;
                    const response = await fetch(url);

                    if (!response.ok) {
                        const errText = await response.text();
                        console.error("Proxy Response Error:", response.status, errText);
                        throw new Error(`Proxy error: ${response.status}`);
                    }
                    return await response.json();
                };

                try {
                    return await fetchHoldings(cleanName);
                } catch (err) {
                    console.warn(`First attempt failed for ${cleanName}, retrying with shorter name...`);
                    const shortName = cleanName.split(' ').slice(0, 3).join(' ');
                    if (shortName !== cleanName && shortName.length > 5) {
                        return await fetchHoldings(shortName);
                    }
                    throw err;
                }
            } catch (e) {
                console.warn("Proxy fetch failed, falling back to simulation:", e);
                return { error: e.message };
            }
        };

        const generateFallbackHoldings = () => {
            const sectors = ['Financials', 'Technology', 'Energy', 'Construction', 'FMCG', 'Automobile', 'Healthcare', 'Metals', 'Services', 'Chemicals'];
            const stocks = [
                'HDFC Bank Ltd.', 'ICICI Bank Ltd.', 'Infosys Ltd.', 'Reliance Industries', 'Larsen & Toubro',
                'ITC Ltd.', 'TCS Ltd.', 'Axis Bank Ltd.', 'Kotak Mahindra Bank', 'Bharti Airtel',
                'State Bank of India', 'HCL Technologies', 'Tata Motors', 'Sun Pharma', 'Maruti Suzuki',
                'Asian Paints', 'Titan Company', 'Bajaj Finance', 'UltraTech Cement', 'NTPC Ltd.',
                'Power Grid Corp', 'Nestle India', 'Tata Steel', 'Wipro Ltd.', 'Mahindra & Mahindra',
                'Coal India', 'Adani Ports', 'JSW Steel', 'Grasim Industries', 'Hindalco',
                'Dr. Reddys Labs', 'Cipla Ltd.', 'Tech Mahindra', 'Divis Labs', 'Apollo Hospitals'
            ];

            const shuffled = [...stocks].sort(() => 0.5 - Math.random());
            const count = 15 + Math.floor(Math.random() * 15);
            const selected = shuffled.slice(0, count);

            let remainingAllocation = 100;
            return selected.map((name, index) => {
                let allocation;
                if (index === count - 1) {
                    allocation = remainingAllocation;
                } else {
                    const max = remainingAllocation - (count - 1 - index) * 0.5;
                    const base = Math.max(0.5, (10 - index * 0.3));
                    allocation = Math.min(max, base + (Math.random() * 2));
                    allocation = Math.round(allocation * 100) / 100;
                }
                remainingAllocation -= allocation;

                return {
                    name,
                    sector: sectors[Math.floor(Math.random() * sectors.length)],
                    allocation: allocation.toFixed(2),
                    return1y: (Math.random() * 50 - 10).toFixed(2),
                    return3y: (Math.random() * 80 - 10).toFixed(2),
                    return1m: (Math.random() * 10 - 2).toFixed(2)
                };
            }).sort((a, b) => parseFloat(b.allocation) - parseFloat(a.allocation));
        };

        let holdingsData = await getRealHoldings();
        let proxyError = null;

        if (!holdingsData || holdingsData.error) {
            proxyError = holdingsData ? holdingsData.error : "Unknown error";
            holdingsData = generateFallbackHoldings();
        }

        if (holdingsData.holdings && Array.isArray(holdingsData.holdings)) {
            holdingsData = holdingsData.holdings;
        }

        return {
            id: data.meta.scheme_code,
            name: data.meta.scheme_name,
            category: data.meta.fund_house,
            nav: currentNav,
            returns: {
                '1D': calculateReturn(1),
                '1W': calculateReturn(7),
                '1M': calculateReturn(30),
                '1Y': calculateReturn(365),
                '3Y': calculateReturn(365 * 3),
                '5Y': calculateReturn(365 * 5),
            },
            history: navHistory.slice(0, 300).reverse().map(item => {
                const [day, month, year] = item.date.split('-');
                return {
                    date: `${year}-${month}-${day}`,
                    nav: parseFloat(item.nav)
                };
            }),
            holdings: holdingsData,
            isRealData: !proxyError && holdingsData.filter(h => h.isReal).length >= holdingsData.length * 0.5,
            proxyError: proxyError
        };
    } catch (error) {
        console.error("Error fetching fund details:", error);
        return null;
    }
};

export const enrichDashboardFunds = async (funds) => {
    const promises = funds.map(async (fund) => {
        try {
            const response = await fetch(`${BASE_URL}/${fund.id}`);
            if (!response.ok) throw new Error('Failed to fetch fund details');
            const data = await response.json();

            const navHistory = data.data;
            const currentNav = parseFloat(navHistory[0].nav);

            const getNavAgo = (days) => {
                if (navHistory.length <= days) return parseFloat(navHistory[navHistory.length - 1].nav);
                return parseFloat(navHistory[days].nav);
            };

            const calculateReturn = (days) => {
                const pastNav = getNavAgo(days);
                if (!pastNav) return 0;
                return (((currentNav - pastNav) / pastNav) * 100).toFixed(2);
            };

            return {
                ...fund,
                nav: currentNav.toFixed(2),
                return1d: calculateReturn(1),
                return6m: calculateReturn(180),
                return1y: calculateReturn(365),
                return3y: calculateReturn(365 * 3)
            };
        } catch (e) {
            console.error(`Error enriching fund ${fund.id}:`, e);
            return fund;
        }
    });
    return Promise.all(promises);
};

export const searchFunds = async (query) => {
    try {
        if (!fundsCache) {
            const response = await fetch(BASE_URL);
            if (!response.ok) throw new Error('Failed to fetch funds');
            fundsCache = await response.json();
        }

        const searchTerm = query.toLowerCase();
        const results = fundsCache
            .filter(f => f.schemeName.toLowerCase().includes(searchTerm))
            .slice(0, 10)
            .map(fund => ({
                id: fund.schemeCode,
                name: fund.schemeName
            }));

        return results;
    } catch (error) {
        console.error("Error searching funds:", error);
        return [];
    }
};

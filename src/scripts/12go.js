
const fs = require("fs");
const fetch = require("node-fetch");
const pLimit = require("p-limit").default;

// Config
const DAYS = 30;
const OUTPUT_FILE = "12go_30day_results.json";
const CONCURRENCY = 5;
const routesData = JSON.parse(fs.readFileSync("routes_id.json", "utf-8"));

const BROWSER_HEADERS = {
  accept: "*/*",
  "accept-language": "en-US,en;q=0.9,ta;q=0.8,pt;q=0.7",
  priority: "u=1, i",
  "sec-ch-ua":
    '"Not)A;Brand";v="8", "Chromium";v="138", "Google Chrome";v="138"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-origin",
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
};

// --- Utils ---
function parseDateFlexible(val, fallbackDateStr) {
  if (!val) return null;
  try {
    if (typeof val === "number") return new Date(val * 1000);

    if (typeof val === "string") {
      let v = val.trim();
      let dt = new Date(v);
      if (!isNaN(dt)) return dt;

      if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(v)) {
        let [h, m, s = 0] = v.split(":").map(Number);
        let base = new Date(fallbackDateStr);
        base.setHours(h, m, s, 0);
        return base;
      }
    }
    return null;
  } catch {
    return null;
  }
}

function extractPrice(pobj) {
  if (!pobj || typeof pobj !== "object") return [null, null];
  const currency = pobj.fxcode;
  let value = pobj.value;

  if (currency && value && value > 0) return [currency.toUpperCase(), value];

  if (currency) {
    let altValue =
      pobj.display_value ||
      pobj.amount ||
      (Array.isArray(pobj.items) && pobj.items[0]?.value);
    if (altValue) return [currency.toUpperCase(), altValue];
  }

  return [currency ? currency.toUpperCase() : null, null];
}

// --- Currency Conversion ---
let ratesToINR = {};

// Common exchange rates as fallback (1 unit = X INR, as of August 2024)
const FALLBACK_RATES = {
  USD: 87.39,
  EUR: 91.76, 
  GBP: 112.00, 
  THB: 2.01,
  MAD: 9.71,
  INR: 1,
};

async function fetchFromAPI(url) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`API call failed (${url}):`, error.message);
    return null;
  }
}

async function fetchRates() {
  console.log("🌍 Fetching live INR conversion rates...");
  
  // Try first API
  let data = await fetchFromAPI("https://api.exchangerate-api.com/v4/latest/INR");
  
  // If first API fails, try second API
  if (!data || !data.rates) {
    console.log("⚠️ First API failed, trying alternative...");
    data = await fetchFromAPI("https://api.exchangerate.host/latest?base=INR");
  }
  
  // If we got rates from API, use them
  if (data && data.rates) {
    // store rates as 1 <currency> = ? INR
    for (let [cur, rate] of Object.entries(data.rates)) {
      ratesToINR[cur] = 1 / rate;
    }
    ratesToINR["INR"] = 1;
    console.log("✅ Currency rates loaded from API");
    console.log("Available currencies:", Object.keys(ratesToINR).join(", "));
    return;
  }
  
  // If all APIs failed, use fallback rates
  console.warn("⚠️ Using fallback exchange rates (may be outdated)");
  ratesToINR = { ...FALLBACK_RATES };
}

function convertToINR(currency, value) {
  if (!currency || value === null || value === undefined) {
    return null;
  }
  
  const upperCurrency = currency.toUpperCase();
  
  // Try to get rate from fetched rates or fallback rates
  let rate = ratesToINR[upperCurrency];
  
  if (!rate && FALLBACK_RATES[upperCurrency]) {
    rate = FALLBACK_RATES[upperCurrency];
    console.warn(`⚠️ Using fallback rate for ${upperCurrency} (1 ${upperCurrency} = ${rate} INR)`);
  }
  
  if (!rate) {
    console.warn(`❌ No conversion rate available for currency: ${upperCurrency}`);
    return null;
  }
  
  const result = +(value * rate).toFixed(2);
  console.log(`💰 ${value} ${upperCurrency} = ${result} INR (1 ${upperCurrency} = ${rate} INR)`);
  return result;
}

// --- Core fetch ---
async function fetchRoute(route, dateStr, results) {
  const { from_title, to_title, from_slug, to_slug, from_id, to_id } = route;
  const apiUrl = `https://12go.asia/api/nuxt/en/trips/search?fromId=${from_id}p&toId=${to_id}p&fromSlug=${from_slug}&toSlug=${to_slug}&people=1&date=${dateStr}&date2=undefined&csrf=&direction=forward`;

  console.log(`Fetching: ${from_title} -> ${to_title} on ${dateStr}`);

  try {
    const resp = await fetch(apiUrl, { headers: BROWSER_HEADERS });
    if (!resp.ok) {
      console.log(
        `❌ Failed ${resp.status} for ${from_title} -> ${to_title} on ${dateStr}`
      );
      return;
    }
    const data = await resp.json();

    const operatorsDict = data.operators || {};
    let tripsFound = 0;

    for (let trip of data.trips || []) {
      if (trip.is_visible === false || trip.bookable === false) continue;

      const params = trip.params || {};
      const segments = trip.segments || [];
      const travelOptions = trip.travel_options || [];
      const segment = segments[0] || {};

      // --- Price ---
      let [currency, price] = [null, null];
      for (let option of travelOptions) {
        let [cur, val] = extractPrice(option.price);
        if (cur && val) {
          currency = cur;
          price = val;
          break;
        }
      }
      if (!currency && params.price)
        [currency, price] = extractPrice(params.price);
      if (!currency && segment.price)
        [currency, price] = extractPrice(segment.price);

      // --- Times ---
      const depTime = params.dep_time || segment.dep_time;
      const arrTime = params.arr_time || segment.arr_time;
      let depDt = parseDateFlexible(depTime, dateStr);
      let arrDt = parseDateFlexible(arrTime, dateStr);

      let durationStr = null;
      if (depDt && arrDt) {
        if (arrDt < depDt) arrDt.setDate(arrDt.getDate() + 1);
        let delta = (arrDt - depDt) / 60000;
        let hours = Math.floor(delta / 60);
        let minutes = delta % 60;
        durationStr = `${hours}h ${minutes}m`;
      }

      // --- Operator ---
      let operatorName =
        params.operator_name ||
        (travelOptions[0]?.operator_name ?? null) ||
        segment.operator_name;

      if (!operatorName) {
        let operatorId =
          params.operator || segment.operator || travelOptions[0]?.operator;
        if (operatorId && operatorsDict[String(operatorId)]) {
          operatorName = operatorsDict[String(operatorId)].name;
        }
      }

      results.push({
        route_url: `https://12go.asia/en/travel/${from_slug}/${to_slug}`,
        From: from_title,
        To: to_title,
        Date: dateStr,
        "Departure Time": depTime,
        "Arrival Time": arrTime,
        "Transport Type": params.vehclasses?.[0] ?? null,
        Duration: durationStr,
        Price: price,
        currency,
        "Price in INR": convertToINR(currency, price), // 👈 NEW
        Operator: operatorName,
        provider: "12go",
      });
      tripsFound++;
    }

    if (tripsFound === 0) {
      console.log(`⚠️ No trips for ${from_title} -> ${to_title} on ${dateStr}`);
    }
  } catch (err) {
    console.error(`Error fetching ${apiUrl}:`, err.message);
  }
}

// --- Main ---
async function main() {
  await fetchRates(); // fetch live rates first

  const results = [];
  const limit = pLimit(CONCURRENCY);
  const start = Date.now();

  const tasks = [];
  for (let route of routesData) {
    for (let dayOffset = 0; dayOffset < DAYS; dayOffset++) {
      let dateStr = new Date(Date.now() + dayOffset * 86400000)
        .toISOString()
        .slice(0, 10);
      tasks.push(limit(() => fetchRoute(route, dateStr, results)));
    }
  }

  await Promise.allSettled(tasks);

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2), "utf-8");
  let elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(
    `✅ Done! Saved ${results.length} results to ${OUTPUT_FILE} in ${elapsed}s`
  );
}

main();

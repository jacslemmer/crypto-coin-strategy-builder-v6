/**
 * AI-powered crypto trend analysis system
 * Supports multiple providers with strict JSON validation
 */

import fs from 'fs/promises';
import path from 'path';

// JSON Schema for strict validation (non-negotiable format)
const TREND_ANALYSIS_SCHEMA = {
  type: 'object',
  required: ['up', 'down', 'sideways'],
  properties: {
    up: {
      type: 'object',
      required: ['confidence', 'countertrend', 'counter_conf'],
      properties: {
        confidence: { type: 'number', minimum: 0, maximum: 1 },
        countertrend: { type: 'string', enum: ['Yes', 'No', 'Low'] },
        counter_conf: { type: 'number', minimum: 0, maximum: 1 }
      },
      additionalProperties: false
    },
    down: {
      type: 'object',
      required: ['confidence', 'countertrend', 'counter_conf'],
      properties: {
        confidence: { type: 'number', minimum: 0, maximum: 1 },
        countertrend: { type: 'string', enum: ['Yes', 'No', 'Low'] },
        counter_conf: { type: 'number', minimum: 0, maximum: 1 }
      },
      additionalProperties: false
    },
    sideways: {
      type: 'object',
      required: ['confidence', 'countertrend', 'counter_conf'],
      properties: {
        confidence: { type: 'number', minimum: 0, maximum: 1 },
        countertrend: { type: 'string', enum: ['Yes', 'No', 'Low'] },
        counter_conf: { type: 'number', minimum: 0, maximum: 1 }
      },
      additionalProperties: false
    }
  },
  additionalProperties: false
};

// Simple JSON schema validator
function validateSchema(data, schema) {
  function validate(obj, schemaObj, path = '') {
    if (schemaObj.type === 'object') {
      if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
        throw new Error(`Expected object at ${path}, got ${typeof obj}`);
      }
      
      // Check required properties
      if (schemaObj.required) {
        for (const prop of schemaObj.required) {
          if (!(prop in obj)) {
            throw new Error(`Missing required property '${prop}' at ${path}`);
          }
        }
      }
      
      // Validate properties
      if (schemaObj.properties) {
        for (const [prop, propSchema] of Object.entries(schemaObj.properties)) {
          if (prop in obj) {
            validate(obj[prop], propSchema, `${path}.${prop}`);
          }
        }
      }
      
      // Check for additional properties
      if (schemaObj.additionalProperties === false) {
        const allowedProps = new Set(Object.keys(schemaObj.properties || {}));
        for (const prop of Object.keys(obj)) {
          if (!allowedProps.has(prop)) {
            throw new Error(`Additional property '${prop}' not allowed at ${path}`);
          }
        }
      }
    } else if (schemaObj.type === 'number') {
      if (typeof obj !== 'number' || isNaN(obj)) {
        throw new Error(`Expected number at ${path}, got ${typeof obj}`);
      }
      if (schemaObj.minimum !== undefined && obj < schemaObj.minimum) {
        throw new Error(`Number ${obj} below minimum ${schemaObj.minimum} at ${path}`);
      }
      if (schemaObj.maximum !== undefined && obj > schemaObj.maximum) {
        throw new Error(`Number ${obj} above maximum ${schemaObj.maximum} at ${path}`);
      }
    } else if (schemaObj.type === 'string') {
      if (typeof obj !== 'string') {
        throw new Error(`Expected string at ${path}, got ${typeof obj}`);
      }
      if (schemaObj.enum && !schemaObj.enum.includes(obj)) {
        throw new Error(`String '${obj}' not in allowed values [${schemaObj.enum.join(', ')}] at ${path}`);
      }
    }
  }
  
  validate(data, schema);
  return true;
}

// Helper function to create the prompt for trend analysis
const createTrendAnalysisPrompt = () => `
Analyze the attached chart screenshot for trends without knowing the asset or time details. Use technical patterns to determine confidences:
- For uptrend: Look for Higher Highs (HH) and Higher Lows (HL); more consistent HH/HL increases confidence.
- For downtrend: Look for Lower Highs (LH) and Lower Lows (LL); more consistent LH/LL increases confidence.
- For sideways/range: Look for lack of consistent HH/HL or LH/LL, or alternating/mixed patterns; bounded oscillations increase confidence.

Precision requirements:
- Provide fine-grained probabilities that reflect subtle pattern nuances.
- Use at least 3 decimal places (3–6 decimals) for ALL numeric confidences (e.g., 0.526 not 0.5).
- Avoid repeated coarse values like 0.6, 0.3 across different images unless they are visually identical.
- Do not round to a single decimal place.

Respond ONLY with valid JSON (no other text, no markdown, no explanations) in this exact format:
{
  "up": {
    "confidence": <number between 0 and 1 for uptrend confidence based on HH/HL patterns>,
    "countertrend": <"Yes" | "No" | "Low">,
    "counter_conf": <number between 0 and 1 for countertrend confidence>
  },
  "down": {
    "confidence": <number between 0 and 1 for downtrend confidence based on LH/LL patterns>,
    "countertrend": <"Yes" | "No" | "Low">,
    "counter_conf": <number between 0 and 1 for countertrend confidence>
  },
  "sideways": {
    "confidence": <number between 0 and 1 for sideways confidence based on mixed/bounded patterns>,
    "countertrend": <"Yes" | "No" | "Low">,
    "counter_conf": <number between 0 and 1 for countertrend confidence>
  }
}
Base the output strictly on the patterns observed in the chart.
`;

// Gemini API provider
class GeminiProvider {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
  }

  async analyze(imageBase64) {
    const prompt = createTrendAnalysisPrompt();
    
    // Convert data URL to just base64 if needed
    let base64Data = imageBase64;
    if (imageBase64.startsWith('data:')) {
      base64Data = imageBase64.split(',')[1];
    }

    const payload = {
      contents: [{
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: 'image/png',
              data: base64Data
            }
          }
        ]
      }],
      generationConfig: {
        temperature: 0.1,
        topP: 0.8,
        topK: 10,
        maxOutputTokens: 1000,
        response_mime_type: 'application/json'
      }
    };

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': this.apiKey
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Invalid response structure from Gemini API');
    }

    let content = data.candidates[0].content.parts[0].text;
    
    // Clean up markdown formatting if present
    content = content.trim();
    if (content.startsWith('```json')) {
      content = content.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (content.startsWith('```')) {
      content = content.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    // Parse JSON and validate strictly
    let parsedJson;
    try {
      parsedJson = JSON.parse(content);
    } catch (e) {
      throw new Error(`Invalid JSON response from AI: ${e.message}. Raw content: ${content.substring(0, 200)}...`);
    }

    // Strict schema validation - reject any deviation
    try {
      validateSchema(parsedJson, TREND_ANALYSIS_SCHEMA);
    } catch (e) {
      throw new Error(`Schema validation failed: ${e.message}`);
    }

    return parsedJson;
  }
}

// Convert image file to base64
async function imageToBase64(filePath) {
  const buffer = await fs.readFile(filePath);
  return `data:image/png;base64,${buffer.toString('base64')}`;
}

// Pair anonymized images with their originals
async function pairImages(trendsDir) {
  const files = await fs.readdir(trendsDir);
  const pairs = [];
  
  // Find all cropped/anonymized images
  const croppedFiles = files.filter(f => f.toLowerCase().includes('_cropped'));
  
  for (const croppedFile of croppedFiles) {
    // Extract symbol (e.g., "ADA_cropped.png" -> "ADA")
    const symbol = croppedFile.split('_')[0].toUpperCase();
    
    // Find matching original: SYMBOLUSDT_*.png
    const originalFile = files.find(f => {
      if (f === croppedFile) return false;
      const upperF = f.toUpperCase();
      return upperF.startsWith(symbol + 'USDT_') && upperF.endsWith('.PNG');
    }) || files.find(f => {
      if (f === croppedFile) return false;
      const upperF = f.toUpperCase();
      return upperF.startsWith(symbol + 'USDT_');
    });
    
    if (originalFile) {
      pairs.push({
        symbol,
        original: path.join(trendsDir, originalFile),
        anonymized: path.join(trendsDir, croppedFile),
        coinId: `coin${pairs.length + 1}`
      });
    } else {
      console.warn(`No original found for ${croppedFile}`);
    }
  }
  
  return pairs;
}

// Function to compute ranks for a list of entries (from original code)
const computeRanks = (entries) => {
  // Sort entries by trend_c desc for Trend_Rank (non-dense: position 1-based)
  const sortedByTrend = [...entries].sort((a, b) => b.trend_c - a.trend_c);
  const withTrendRank = entries.map(entry => ({
    ...entry,
    trend_rank: sortedByTrend.findIndex(e => e === entry) + 1,
  }));

  // Sort by countertrend_c desc for CT_Rank (non-dense)
  const sortedByCT = [...withTrendRank].sort((a, b) => b.countertrend_c - a.countertrend_c);
  const withCTRank = withTrendRank.map(entry => ({
    ...entry,
    ct_rank: sortedByCT.findIndex(e => e === entry) + 1,
  }));

  // Add Rank_Sum
  const withSums = withCTRank.map(entry => ({
    ...entry,
    rank_sum: entry.trend_rank + entry.ct_rank,
  }));

  // For final per-row Rank: sort by rank_sum desc, then dense rank
  const sortedBySum = [...withSums].sort((a, b) => b.rank_sum - a.rank_sum);
  const sums = sortedBySum.map(e => e.rank_sum);
  const uniqueSumsDesc = [...new Set(sums)]; // Unique in desc order
  return withSums.map(entry => ({
    ...entry,
    rank: uniqueSumsDesc.indexOf(entry.rank_sum) + 1,
  }));
};

// Function to compute coin ranks based on max confidence per coin with tiebreaker for unique rankings
const computeCoinRanks = (entries) => {
  // First, get max confidence per coin
  const pairMaxMap = new Map();
  entries.forEach(entry => {
    const currentMax = pairMaxMap.get(entry.pair) || 0;
    pairMaxMap.set(entry.pair, Math.max(currentMax, entry.trend_c));
  });

  // For tiebreaking, also compute sum of all confidences per coin
  const pairSumMap = new Map();
  entries.forEach(entry => {
    const currentSum = pairSumMap.get(entry.pair) || 0;
    pairSumMap.set(entry.pair, currentSum + entry.trend_c);
  });

  // Sort pairs by: 1) max_conf desc, 2) sum_conf desc, 3) alphabetical (for ultimate determinism)
  const sortedPairs = [...pairMaxMap.entries()].sort((a, b) => {
    const [pairA, maxA] = a;
    const [pairB, maxB] = b;
    
    // Primary: max confidence
    if (maxB !== maxA) return maxB - maxA;
    
    // Tiebreaker 1: sum of all confidences
    const sumA = pairSumMap.get(pairA);
    const sumB = pairSumMap.get(pairB);
    if (sumB !== sumA) return sumB - sumA;
    
    // Tiebreaker 2: alphabetical (deterministic)
    return pairA.localeCompare(pairB);
  });

  // Assign sequential ranks 1, 2, 3, ..., N (no ties)
  const coinRankMap = new Map();
  sortedPairs.forEach(([pair], index) => {
    coinRankMap.set(pair, index + 1);
  });

  return coinRankMap;
};

// Function to process multiple AI responses and build table data (from original code)
const buildTrendTable = (pairAnalyses) => {
  // Flatten to entries like in the table (using 'Up' for High, 'Down' for Low)
  const flatEntries = pairAnalyses.flatMap(({ pair, id, analysis }) => [
    {
      pair,
      id,
      trend: 'Up',
      trend_c: analysis.up.confidence,
      countertrend: analysis.up.countertrend,
      countertrend_c: analysis.up.counter_conf,
    },
    {
      pair,
      id,
      trend: 'Down',
      trend_c: analysis.down.confidence,
      countertrend: analysis.down.countertrend,
      countertrend_c: analysis.down.counter_conf,
    },
    {
      pair,
      id,
      trend: 'Sideways',
      trend_c: analysis.sideways.confidence,
      countertrend: analysis.sideways.countertrend,
      countertrend_c: analysis.sideways.counter_conf,
    },
  ]);

  // Compute per-row ranks
  const withRanks = computeRanks(flatEntries);

  // Compute per-coin ranks
  const coinRankMap = computeCoinRanks(flatEntries);

  // Add coin_rank to each entry
  return withRanks.map(entry => ({
    ...entry,
    coin_rank: coinRankMap.get(entry.pair),
  }));
};

// Main analysis function
export async function analyzeTrendImages(trendsDir, apiKey, options = {}) {
  const { provider = 'gemini', maxConcurrency = 2 } = options;
  
  console.log('🔍 Pairing images...');
  const imagePairs = await pairImages(trendsDir);
  console.log(`Found ${imagePairs.length} image pairs`);
  
  // Initialize provider
  let aiProvider;
  if (provider === 'gemini') {
    aiProvider = new GeminiProvider(apiKey);
  } else {
    throw new Error(`Unsupported provider: ${provider}`);
  }
  
  console.log('🤖 Analyzing images with AI...');
  const analyses = [];
  
  // Process images with simple rate limiting
  for (let i = 0; i < imagePairs.length; i++) {
    const pair = imagePairs[i];
    console.log(`Analyzing ${pair.symbol} (${i + 1}/${imagePairs.length})...`);
    
    try {
      const imageBase64 = await imageToBase64(pair.anonymized);
      const analysis = await aiProvider.analyze(imageBase64);
      
      analyses.push({
        pair: pair.symbol,
        id: pair.coinId,
        analysis,
        original: pair.original,
        anonymized: pair.anonymized
      });
      
      console.log(`✅ ${pair.symbol}: Up=${analysis.up.confidence.toFixed(3)}, Down=${analysis.down.confidence.toFixed(3)}, Sideways=${analysis.sideways.confidence.toFixed(3)}`);
      
      // Simple rate limiting
      if (i < imagePairs.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`❌ Failed to analyze ${pair.symbol}: ${error.message}`);
    }
  }
  
  console.log('📊 Computing rankings...');
  const tableData = buildTrendTable(analyses);
  
  return {
    analyses,
    tableData,
    imagePairs
  };
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  // Development fallback key for UAT (env var takes precedence)
  const DEV_GEMINI_API_KEY_FALLBACK = 'AIzaSyC5qPVs-DEV-PLACEHOLDER-ONLY';
  const apiKey = process.env.GEMINI_API_KEY || DEV_GEMINI_API_KEY_FALLBACK;
  if (!apiKey) {
    console.error('Missing GEMINI_API_KEY and no dev fallback configured');
    process.exit(1);
  }
  const trendsDir = process.argv[2] || '/Users/jacobuslemmer/Desktop/TrendAnalyses';
  
  try {
    const results = await analyzeTrendImages(trendsDir, apiKey);
    
    console.log('\n📈 TREND ANALYSIS RESULTS');
    console.log('========================');
    
    // Group by coin for display
    const byCoin = new Map();
    results.tableData.forEach(entry => {
      if (!byCoin.has(entry.pair)) {
        byCoin.set(entry.pair, []);
      }
      byCoin.get(entry.pair).push(entry);
    });
    
    // Sort coins by coin_rank
    const sortedCoins = [...byCoin.entries()].sort((a, b) => a[1][0].coin_rank - b[1][0].coin_rank);
    
    sortedCoins.forEach(([symbol, entries]) => {
      console.log(`\n${symbol} (Coin Rank: ${entries[0].coin_rank})`);
      entries.forEach(entry => {
        const trendConf = entry.trend_c ? entry.trend_c.toFixed(3) : '0.000';
        const counterConf = entry.countertrend_c ? entry.countertrend_c.toFixed(3) : '0.000';
        console.log(`  ${entry.trend.padEnd(8)} | Conf: ${trendConf} | CT: ${entry.countertrend.padEnd(3)} (${counterConf}) | Rank: ${entry.rank}`);
      });
    });
    
    // Save detailed results (JSON)
    const outputFile = 'trend-analysis-results.json';
    await fs.writeFile(outputFile, JSON.stringify(results, null, 2));
    console.log(`\n💾 Detailed results saved to ${outputFile}`);

    // Save CSV table to the TrendAnalyses folder alongside images
    const csvHeaders = [
      'pair',
      'id',
      'trend',
      'trend_c',
      'trend_rank',
      'countertrend',
      'countertrend_c',
      'ct_rank',
      'rank_sum',
      'rank',
      'coin_rank',
      'original_path',
      'anonymized_path'
    ];

    // Build a quick lookup from pair -> paths
    const pairToPaths = new Map();
    results.analyses.forEach(a => {
      pairToPaths.set(a.pair, { original: a.original, anonymized: a.anonymized });
    });

    const csvRows = [csvHeaders.join(',')];
    results.tableData.forEach(row => {
      const paths = pairToPaths.get(row.pair) || { original: '', anonymized: '' };
      const values = [
        row.pair,
        row.id,
        row.trend,
        typeof row.trend_c === 'number' ? row.trend_c.toFixed(6) : '',
        row.trend_rank,
        row.countertrend,
        typeof row.countertrend_c === 'number' ? row.countertrend_c.toFixed(6) : '',
        row.ct_rank,
        row.rank_sum,
        row.rank,
        row.coin_rank,
        paths.original,
        paths.anonymized
      ];
      const escaped = values.map(v => {
        const s = String(v ?? '');
        return /[,"]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      });
      csvRows.push(escaped.join(','));
    });

    const csvOutputPath = path.join(trendsDir, 'trend-analysis-table.csv');
    await fs.writeFile(csvOutputPath, csvRows.join('\n'));
    console.log(`💾 CSV table saved to ${csvOutputPath}`);
    
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
    process.exit(1);
  }
}

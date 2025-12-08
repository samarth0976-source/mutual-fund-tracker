// Download and analyze Kotak Scrip Master CSVs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CSV_URLS = [
    'https://lapi.kotaksecurities.com/wso2-scripmaster/v1/prod/2025-12-06/transformed-v1/nse_cm-v1.csv',
    'https://lapi.kotaksecurities.com/wso2-scripmaster/v1/prod/2025-12-06/transformed-v1/bse_cm-v1.csv'
];

async function downloadAndAnalyze(url) {
    const filename = path.basename(url);
    console.log(`\n📥 Downloading: ${filename}`);

    try {
        const response = await fetch(url);
        const text = await response.text();

        // Parse CSV
        const lines = text.split('\n');
        const headers = lines[0].split(',');

        console.log(`✅ Downloaded: ${lines.length} rows`);
        console.log(`📋 Headers: ${headers.join(', ')}`);

        // Show sample data
        console.log(`\n📊 Sample data (first 5 rows):`);
        for (let i = 1; i < Math.min(6, lines.length); i++) {
            console.log(`   ${lines[i].substring(0, 150)}...`);
        }

        // Search for mutual fund related entries
        console.log(`\n🔍 Searching for Mutual Fund entries...`);
        const mfKeywords = ['mutual', 'mf', 'etf', 'fund', 'nifty', 'index'];
        let mfCount = 0;
        const mfExamples = [];

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].toLowerCase();
            if (mfKeywords.some(kw => line.includes(kw))) {
                mfCount++;
                if (mfExamples.length < 10) {
                    mfExamples.push(lines[i]);
                }
            }
        }

        console.log(`   Found ${mfCount} entries with MF/ETF keywords`);
        if (mfExamples.length > 0) {
            console.log(`   Examples:`);
            mfExamples.forEach(ex => console.log(`   - ${ex.substring(0, 120)}...`));
        }

        // Save to file for reference
        fs.writeFileSync(`kotak_${filename}`, text);
        console.log(`💾 Saved to: kotak_${filename}`);

        return { headers, rowCount: lines.length };
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
        return null;
    }
}

async function main() {
    console.log('='.repeat(60));
    console.log('KOTAK SCRIP MASTER ANALYSIS');
    console.log('='.repeat(60));

    for (const url of CSV_URLS) {
        await downloadAndAnalyze(url);
    }

    console.log('\n\n✅ Analysis complete!');
}

main();

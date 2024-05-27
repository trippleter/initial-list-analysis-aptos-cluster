const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');
const { createObjectCsvWriter } = require('csv-writer');

// Sorts data from final_with_nonce_5/final.csv file in descending order by aptos_nonce

// Define input and output file paths
const inputCSV = 'final_5_with_nonce/final.csv';
const outputCSV = 'final_5_with_nonce/final_sybil_data.csv';

// Function to process the CSV file
function processCSV() {
  const results = [];
  const aptosWallets = new Set();

  fs.createReadStream(inputCSV)
    .pipe(csv())
    .on('data', (row) => {
      // Check for duplicates
      if (!aptosWallets.has(row.APTOS_WALLET)) {
        results.push(row);
        aptosWallets.add(row.APTOS_WALLET);
      } 
    })
    .on('end', () => {
      // Sort results by nonce in descending order
      results.sort((a, b) => b.NONCE - a.NONCE);
      writeResultsToCSV(results, outputCSV);
    });
}

// Function to write results to output CSV file
function writeResultsToCSV(results, outputFilePath) {
  const csvWriter = createObjectCsvWriter({
    path: outputFilePath,
    header: [
      { id: 'SENDER_WALLET', title: 'SENDER_WALLET' },
      { id: 'APTOS_WALLET', title: 'APTOS_WALLET' },
      { id: 'TX_HASH', title: 'TX_HASH' },
      { id: 'NETWORK', title: 'NETWORK' },
      { id: 'NONCE', title: 'NONCE' },
    ],
  });

  csvWriter
    .writeRecords(results)
    .then(() => console.log(`Results written to ${outputFilePath}`));
}

// Run the script
processCSV();

const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

// Creates Aptos wallet sybil list from final_sybil_data.csv file


// Define input and output file paths
const inputCSV = 'final_5_with_nonce/final_sybil_data.csv';
const outputTXT = 'final_5_with_nonce/aptos_sybil_list.txt';

// Function to process the CSV file
function processCSV() {
  const aptosWallets = new Set();

  fs.createReadStream(inputCSV)
    .pipe(csv())
    .on('data', (row) => {
      aptosWallets.add(row.APTOS_WALLET);
    })
    .on('end', () => {
      writeResultsToTXT(Array.from(aptosWallets), outputTXT);
    });
}

// Function to write results to output text file
function writeResultsToTXT(results, outputFilePath) {
  fs.writeFile(outputFilePath, results.join('\n'), 'utf8', (err) => {
    if (err) {
      console.error(`Error writing to ${outputFilePath}:`, err);
    } else {
      console.log(`APTOS_WALLET addresses written to ${outputFilePath}`);
    }
  });
}

// Run the script
processCSV();

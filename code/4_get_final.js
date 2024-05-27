const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

// This file filters Aptos wallets from file #3 by nonce >= minNonce:

// Takes in aptos nonce, initialList and mapped aptos-evm files
// Outputs SENDER_WALLET,APTOS_WALLET,TX_HASH,NETWORK,NONCE csv file
// Run multiple times with different networks, save everything into same file: final_with_nonce_5/final.csv

const chain = 'poly'; // see chains dictionary below

// Define input and output file paths
const aptosNonceCSV = 'aptos_nonce.csv';
const initialListTXT = 'initialList.txt';
const inputCSV = path.join('apt_evm_map', `${chain}.csv`);
const outputCSV = path.join('final_with_nonce_5', `final.csv`);

const minNonce = 5; // can define a smaller/bigger nonce

const chains = {
  'arb': 'Arbitrum',
  'avax': 'Avalanche',
  'bsc': 'BNB Chain',
  'bnb': 'BNB Chain',
  'core': 'Core Blockchain Mainnet',
  'eth': 'Ethereum',
  'op': 'Optimism',
  'poly': 'Polygon',
}
const network = chains[chain]; // Specify the network here

// Load wallets with nonce >= minNonce into a set with nonce values
const nonceWallets = new Map();
fs.createReadStream(aptosNonceCSV)
  .pipe(csv())
  .on('data', (row) => {
    const wallet = row.wallet;
    const nonce = parseInt(row.nonce, 10);
    if (nonce >= minNonce) {
      nonceWallets.set(wallet, nonce);
    }
  })
  .on('end', () => {
    console.log(`Loaded wallets with nonce >= ${minNonce}`);
    loadTxtFile();
  });

// Load wallets from txt file into two sets based on length
const walletsLength42 = new Set();
const walletsLengthGt55 = new Set();

function loadTxtFile() {
  fs.readFile(initialListTXT, 'utf8', (err, data) => {
    if (err) {
      console.error(err);
      return;
    }
    const lines = data.split('\n');
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();

      // There are some errors in the initial list (some wallets are not wallets but scientific notation, e.g. 3.12826957405965E+46 line 17730)
      const isScientificNotation = /^[+-]?\d+(\.\d+)?[eE][+-]?\d+$/.test(trimmedLine);

      if (!isScientificNotation) {
        if (trimmedLine.length === 42) {
          walletsLength42.add(trimmedLine);
        } else if (trimmedLine.length > 55) {
          walletsLengthGt55.add(trimmedLine);
        } else {
          console.log(`Weird line at index ${index + 1}: "${line}"`);
        }
      }
    });
    console.log(`EVM len in initial list = ${walletsLength42.size}`);
    console.log(`Aptos len in initial list = ${walletsLengthGt55.size}`);
    processInputCSV();
  });
}

// Process input CSV file and check conditions
function processInputCSV() {
  const results = [];

  fs.createReadStream(inputCSV)
    .pipe(csv())
    .on('data', (row) => {
      const senderWallet = row.SENDER_WALLET;
      const aptosWallet = row.APTOS_WALLET;

      if (
        nonceWallets.has(aptosWallet) &&
        walletsLength42.has(senderWallet) &&
        !walletsLengthGt55.has(aptosWallet)
      ) {
        const nonce = nonceWallets.get(aptosWallet);
        results.push({ ...row, nonce });
      }
    })
    .on('end', () => {
      // Sort results by nonce in descending order
      results.sort((a, b) => b.nonce - a.nonce);
      appendResultsToCSV(results, outputCSV);
    });
}

// Append results to output CSV file
function appendResultsToCSV(results, outputFilePath) {
  const writeHeaders = !fs.existsSync(outputFilePath);

  const csvWriter = require('csv-writer').createObjectCsvWriter({
    path: outputFilePath,
    header: [
      { id: 'SENDER_WALLET', title: 'SENDER_WALLET' },
      { id: 'APTOS_WALLET', title: 'APTOS_WALLET' },
      { id: 'TX_HASH', title: 'TX_HASH' },
      { id: 'network', title: 'NETWORK' },
      { id: 'nonce', title: 'NONCE' },
    ],
    append: true, // Append mode
    headerIdDelimiter: '.', // Ensure the header ID delimiter is set to avoid rewriting headers
  });

  if (writeHeaders) {
    // If the file does not exist, write headers and records
    const resultsWithNetwork = results.map(record => ({ ...record, network }));
    csvWriter
      .writeRecords(resultsWithNetwork)
      .then(() => console.log(`Results written to ${outputFilePath}`));
  } else {
    // If the file exists, append records without headers
    const csvStringifier = require('csv-writer').createObjectCsvStringifier({
      header: [
        { id: 'SENDER_WALLET', title: 'SENDER_WALLET' },
        { id: 'APTOS_WALLET', title: 'APTOS_WALLET' },
        { id: 'TX_HASH', title: 'TX_HASH' },
        { id: 'network', title: 'NETWORK' },
        { id: 'nonce', title: 'NONCE' },
      ],
    });

    const resultsWithNetwork = results.map(record => ({ ...record, network }));
    const recordsString = csvStringifier.stringifyRecords(resultsWithNetwork);

    fs.appendFileSync(outputFilePath, recordsString, 'utf8');
    console.log(`Results appended to ${outputFilePath}`);
  }
}

// Run the script
console.log(`Starting processing for network: ${network}`);

const fs = require('fs');
const readline = require('readline');
const path = require('path');

// Gets Aptos wallet layerzero message count:

// From data/apt_d.csv checks each wallet's number of layerzero messages sent
// Doesn't account for multiple messages in 1 tx (will count as 2 different txs)

// Define the input and output file paths
const inputFilePath = 'data/apt_d.csv';
const outputFilePath = 'aptos_nonce.csv';

// Create read stream for input file
const rl = readline.createInterface({
    input: fs.createReadStream(inputFilePath),
    crlfDelay: Infinity
});

// Dictionary to store transaction counts
const transactionCounts = {};

let lineCount = 0;

rl.on('line', (line) => {
    lineCount++;
    if (lineCount % 500000 === 0) {
        console.log(`Processed ${lineCount} lines`);
    }

    // Skip the header line if it exists
    if (lineCount === 1 && line.startsWith(',')) return;

    const columns = line.split(',');

    const SENDER_WALLET = columns[6];

    if (transactionCounts[SENDER_WALLET]) {
        transactionCounts[SENDER_WALLET]++;
    } else {
        transactionCounts[SENDER_WALLET] = 1;
    }
});

rl.on('close', () => {
    const outputLines = ['wallet,nonce'];
    
    // Convert the dictionary to an array and sort by transaction count in descending order
    const sortedTransactions = Object.entries(transactionCounts).sort((a, b) => b[1] - a[1]);
    
    // Add sorted entries to the output lines
    for (const [wallet, nonce] of sortedTransactions) {
        outputLines.push(`${wallet},${nonce}`);
    }

    fs.writeFileSync(outputFilePath, outputLines.join('\n'));
    console.log('Transaction counts have been written to', outputFilePath);
    console.log(`Total number of unique wallets: ${sortedTransactions.length}`);
});

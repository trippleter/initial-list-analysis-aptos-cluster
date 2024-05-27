const fs = require('fs');
const readline = require('readline');
const path = require('path');

// Extracts all needed transactions from presnapshot transactions:

// Script takes as input 2 files: initialList.txt and all layerzero transactions from github (https://github.com/LayerZero-Labs/sybil-report)
// Outputs a data folder with ${chain}_d.csv file, with every line being in format below of EVM-Aptos transactions
// ['SOURCE_CHAIN', 'SOURCE_TRANSACTION_HASH', 'SOURCE_CONTRACT', 'DESTINATION_CHAIN', 'DESTINATION_TRANSACTION_HASH', 'DESTINATION_CONTRACT', 'SENDER_WALLET', 'SOURCE_TIMESTAMP_UTC', 'PROJECT', 'NATIVE_DROP_USD', 'STARGATE_SWAP_USD']
// Also, in the same data directory creates a file apt_d.csv with all Aptos-EVM transactions
// (you should create an empty data folder before running the script)


const initialListFilePath = 'initialList.txt';
const csvFilePath = '2024-05-15-snapshot1_transactions.csv';

// Create a set of wallet addresses from the initialList.txt file
const walletSet = new Set(fs.readFileSync(initialListFilePath, 'utf8').split('\n').map(line => line.trim()));

// Define the projects to filter by
const projects = ['Aptos Bridge', 'Bitcoin Bridge', 'PancakeSwap'];

// Create read and write streams
const rl = readline.createInterface({
    input: fs.createReadStream(csvFilePath),
    crlfDelay: Infinity
});

let lineCount = 0;

rl.on('line', (line) => {
    if (lineCount % 1000000 === 0) {
        console.log(`Processed ${lineCount} lines`);
    }
    lineCount++;


    const columns = line.split(',');

    const SOURCE_CHAIN = columns[0];
    const DESTINATION_CHAIN = columns[3];
    const SENDER_WALLET = columns[6];
    const PROJECT = columns[8];
    const sender_length = SENDER_WALLET.length

    if (projects.includes(PROJECT)) {
        if (sender_length >= 60) {
            // aptos wallets are written in data/apt_d.csv (these are aptos wallets in order to later filter )
            fs.appendFileSync(path.join('data', 'apt_d.csv'), line + '\n');
        } else if (SENDER_WALLET.length === 42 && walletSet.has(SENDER_WALLET) && DESTINATION_CHAIN == '') {
            const destinationFile = path.join('data', `${SOURCE_CHAIN}_d.csv`);
            fs.appendFileSync(destinationFile, line + '\n');
            walletSet.delete(SENDER_WALLET);
        } else if (SENDER_WALLET.length !== 42 && SENDER_WALLET.length !== 0) {
            console.log(line);
        }
    }
});

rl.on('close', () => {
    console.log('Processing completed.');
});

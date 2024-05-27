const ethers = require('ethers')
const fs = require('fs')
const readline = require('readline');
const { parse } = require('json2csv');

// This file maps EVM from initialList.txt to its Aptos wallet from input data:

// Takes in a data file from step 1, and for every transaction calls an eth_getTransactionByHash method 
// Based on the input data and its method ID extracts the corresponding Aptos wallet (receiver of the funds of that tx)
// Creates a new file in apt_evm_map folder with the format: ['SENDER_WALLET', 'APTOS_WALLET', 'TX_HASH']
// Run multiple times with different networks based on what there is in data folder

const maxBatchSize = 50 // adjust the batch size, we used the custom paid quicknode which worked fine with 100 walls/seconds (sleep every 500ms)
const rpc_url = 'https://rpc.ankr.com/core'
const input_file = 'data/Core Blockchain Mainnet_d.csv'
const output_file_path = 'apt_evm_map/core.csv'

async function main() {

    await processTransactions(input_file)

}

main()

async function processTransactions(filePath) {
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let batch = [];

    for await (const line of rl) {
        const parts = line.split(',');
        const senderWallet = parts[6];
        const txHash = parts[1];

        batch.push({ senderWallet, txHash });


        if (batch.length === maxBatchSize) {
            let resultsToRetry = await processBatch(batch);
            batch = [];
            let retry_count = 0
            while (resultsToRetry.length > 0 && retry_count < 3) {
                // batch = [...resultsToRetry];
                resultsToRetry = await processBatch(resultsToRetry);
                console.log(`Retrying #${retry_count}`);
                retry_count++
                await sleep(2000);
            }
            if (retry_count >= 3) {
                for (bad of resultsToRetry){
                    fs.appendFileSync('./bad_apts.txt', JSON.stringify(bad)+'\n')
                }
            }
            await sleep(500)
        }
    }

    if (batch.length > 0) {
        await processBatch(batch);
    }
}

async function processBatch(batch) {

    const promises = batch.map(tx => ({
        method: 'eth_getTransactionByHash',
        params: [tx.txHash]
    }))

    const results = await sendBatchRequest(promises)
    return await processResults(results, batch)

}

async function processResults(results, batch) {
    let results_to_retry = []
    for (let i=0; i < results.length; i++) {
        const result = results[i];
        const tx = batch[i];

        if (result.error) {
            results_to_retry.push(tx)
            console.log(`Err with tx ${JSON.stringify(tx)}, result = ${JSON.stringify(result)}`)
        } else {
            const transaction = result.result;
            if (transaction && transaction.from === tx.senderWallet) {
                const aptosAddress = extractAptosAddress(transaction.input);
                if (aptosAddress) {
                    appendToCsv(output_file_path, {
                        SENDER_WALLET: tx.senderWallet,
                        APTOS_WALLET: aptosAddress,
                        TX_HASH: tx.txHash
                    }, ['SENDER_WALLET', 'APTOS_WALLET', 'TX_HASH']);
                } else {
                    results_to_retry.push(tx)
                    console.log(`Err with aptos addr parse = ${JSON.stringify(transaction)}`)
                }
            } else {
                results_to_retry.push(tx)
                console.log(`Bad tx resp = ${JSON.stringify(result)}`)
            }
        }
    }
    return results_to_retry
}

async function sendBatchRequest(reqs) {
    for (let i = 0; i < reqs.length; i++) {
        reqs[i].id = i;
        reqs[i].jsonrpc = '2.0';
    }

    return await sendR(reqs);
}

// Function to send request and rotate RPC URLs
async function sendR(req) {

    const res = await fetch(rpc_url, {
        method: 'POST',
        body: JSON.stringify(req),
        headers: { 'Content-Type': 'application/json' }
    });

    const results = await res.json();
    return results;
}


// Append data to a CSV file
function appendToCsv(filename, data, fields) {
    const opts = { fields, header: !fs.existsSync(filename) };
    try {
        const csv = parse([data], opts);
        fs.appendFileSync(filename, csv + '\n');
    } catch (err) {
        console.error('Error writing to CSV:', err);
    }
}


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function extractAptosAddress(input) {
    const selector = input.slice(0, 10);
    if (selector === '0xca23bb4c') {
        return '0x' + input.slice(10, 74).replace(/^0+/, '');
    } else if (selector === '0x76a9099a' || selector === '0x563476dc') {
        return '0x' + input.slice(74, 138).replace(/^0+/, '');
    } else if (selector === '0xb09bbd91' || selector == '0x9064aa17') {
        return '0x' + input.slice(138, 202).replace(/^0+/, '');
    } else if (selector === '0x2cdf0b95' || selector == '0x85154849') {
        if (input.slice(74, 138).replace(/^0+/, '') === '6c') {
            return '0x' + input.slice(138, 202).replace(/^0+/, '');
        } else {
            console.log('bad network', input);
        }
    } else if (selector == '0xf316d227') {
        return '0x' + input.slice(266, 330).replace(/^0+/, '');
    } else {
        console.log(input);
    }
    return null;
}
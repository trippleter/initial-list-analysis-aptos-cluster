final_sybil_data.csv file contains the justification on why each EVM wallet is mapped with a certain Aptos wallet. You can check by going to the explorer of the NETWORK, pasting TX_HASH and decoding input data

final_sybil_list.txt file contains all the Aptos sybils found

code directory contains full code used to get the data above

Brief Algorithm:
Step 1: Take all EVM wallets from initialList.txt
Step 2: Find those that bridged to Aptos (thus, they own the address)
Step 3: See that Aptos address sent at least 5 messages
Step 4: Format data, and extract the final_sybil_list.txt

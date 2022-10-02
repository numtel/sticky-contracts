const https = require('https');
const fs = require('fs');
const Web3 = require('web3');
const {MerkleTree} = require('merkletreejs');
const keccak256 = require('keccak256');

const GAS_SAFETY_FACTOR = 1.5;
const EXPLORER = 'https://polygonscan.com/tx/';

// { "private": "64 char hex", "public": "0xaddress", "factory": "0xaddress" }
const config = require('../../sticky-oracle.json');

const web3 = new Web3('https://polygon-rpc.com/');

const signer = web3.eth.accounts.privateKeyToAccount(config.private);
web3.eth.accounts.wallet.add(signer);
const factoryAbi = JSON.parse(fs.readFileSync(`utils/StickyFactory.abi`, { encoding: 'utf8' }));
const factory = new web3.eth.Contract(factoryAbi, config.factory);

let leafData, leaves, epochTotal;
try {
  leafData = JSON.parse(fs.readFileSync(process.argv[2], { encoding: 'utf8' }));
} catch(error) {
  throw new Error('Invalid epoch data JSON filename specified as first argument');
}
try {
  leaves = Object.entries(leafData).map(leaf => keccak256(
    Buffer.from(web3.utils.encodePacked(
      {value: leaf[0], type:'address'},
      {value: leaf[1], type:'uint256'}
    ).slice(2), 'hex')
  ));
  epochTotal = Object.values(leafData).reduce((prev, cur) => prev + cur, 0);
} catch(error) {
  console.error(error);
  throw new Error('Invalid epoch data, must be {"address": number} format');
}

(async function() {
  // Generate the tree
  const tree = new MerkleTree(leaves, keccak256, {sort:true});
  const root = tree.getHexRoot();

  const epochCount = await factory.methods.epochsCount().call();
  // Publish the epoch merkle root
  console.log('Defining epoch...');
//   await send(factory.methods.defineEpoch(root, epochTotal));
  console.log('Performing interest collection...');
  await send(factory.methods.collectInterest(epochCount - 1, 0, 100));
  // Called after finishing interest collection
  console.log('Emiting new epoch event...');
  await send(factory.methods.emitNewEpoch());
})();

async function send(tx) {
  const gasPrice = await fetchGasPrice() * GAS_SAFETY_FACTOR;
  console.log('foo', tx, gasPrice);
  const gas = await tx.estimateGas({ from: signer.address });
  console.log(gas, gasPrice);
  const result = await tx.send({
    from: signer.address,
    gas,
    gasPrice
  }).once('transactionHash', txHash => {
    console.log(EXPLORER + txhash);
  });
  return result;
}

function fetchGasPrice() {
  const BN = web3.utils.BN;
  return new Promise((resolve, reject) => {
    https.get('https://gasstation-mainnet.matic.network/', res => {
      if(res.statusCode !== 200) return reject(new Error('NOT_OK'));
      res.on('data', data => {
        data = JSON.parse(data);
        resolve(new BN(String(data.fastest * 10)).mul(new BN('10').pow(new BN('8'))).toString());
      });
    }).on('error', error => {
      reject(error);
    });
  });
}

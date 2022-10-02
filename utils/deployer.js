const Web3 = require('web3');
const fs = require('fs');

const config = require('../../deploy-sticky.json');
const chainParams = {
  gas: 15000000,
  gasPrice: 60000000000,
  explorer: 'https://polygonscan.com/tx/',
};
const BUILD_DIR = 'build/';

const web3 = new Web3('https://polygon-rpc.com/');

const signer = web3.eth.accounts.privateKeyToAccount(config.private);
web3.eth.accounts.wallet.add(signer);

const addr = {
  USDC_TOKEN: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
  USDT_TOKEN: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f',
  DAI_TOKEN: '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063',
  WMATIC_TOKEN: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
  WMATIC_USDC_POOL: '0x6e7a5fafcec6bb1e78bae2a1f0b612012bf14827',
  USDC_USDT_POOL: '0x2cf7252e74036d1da831d11089d326296e64a728',
  USDC_DAI_POOL: '0xf04adbf75cdfc5ed26eea4bbbb991db002036bdd',
  MATIC_FEED: '0xab594600376ec9fd91f8e885dadf0ce036862de0',
  USDC_FEED: '0xfe4a8cc5b5b2366c1b58bea3858e81843581b2f7',
  USDT_FEED: '0x0A6513e40db6EB1b165753AD52E80663aeA50545',
  DAI_FEED: '0x4746dec9e833a82ec7c2c1356372ccf2cfcd2f3d',
  AAVE_POLYGON_POOL: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
  aPolUSDC: '0x625E7708f30cA75bfd92586e17077590C60eb4cD',
  aPolUSDT: '0x6ab707Aca953eDAeFBc4fD23bA73294241490620',
  aPolDAI: '0x82E64f49Ed5EC1bC6e43DAD4FC8Af9bb3A2312EE',
  aPolWMATIC: '0x6d80113e533a2C0fe82EaBD35f1875DcEA89Ea97',
  BURN: '0x0000000000000000000000000000000000000000',
};

(async function() {
  const factory = await loadContract('factory', 'StickyFactory', [
    addr.USDC_TOKEN, // rewardToken
  ]);

  const usdcPool = await loadContract('usdcPool', 'StickyAavePool', [
    addr.AAVE_POLYGON_POOL,
    addr.aPolUSDC,
    addr.USDC_TOKEN,
    factory.options.address,
    'Sticky USDC Aave Pool',
    'stickyUSDC'
  ]);
  // No helper necessary since pool token is same as reward token
  await addPool(factory, usdcPool);

  const usdtPool = await loadContract('usdtPool', 'StickyAavePool', [
    addr.AAVE_POLYGON_POOL,
    addr.aPolUSDT,
    addr.USDT_TOKEN,
    factory.options.address,
    'Sticky USDT Aave Pool',
    'stickyUSDT'
  ]);
  const usdtHelper = await loadContract('usdtHelper', 'UniswapV2Helper', [
    addr.USDT_FEED, // input
    addr.USDC_FEED, // output
    addr.USDC_USDT_POOL,
    addr.USDT_TOKEN, // input
    addr.USDC_TOKEN, // output
    99, 100 // slippage
  ]);
  await addPool(factory, usdtPool, usdtHelper);

  const daiPool = await loadContract('daiPool', 'StickyAavePool', [
    addr.AAVE_POLYGON_POOL,
    addr.aPolDAI,
    addr.DAI_TOKEN,
    factory.options.address,
    'Sticky DAI Aave Pool',
    'stickyDAI'
  ]);
  const daiHelper = await loadContract('daiHelper', 'UniswapV2Helper', [
    addr.DAI_FEED, // input
    addr.USDC_FEED, // output
    addr.USDC_DAI_POOL,
    addr.DAI_TOKEN, // input
    addr.USDC_TOKEN, // output
    99, 100 // slippage
  ]);
  await addPool(factory, daiPool, daiHelper);

  const wmaticPool = await loadContract('wmaticPool', 'StickyAavePool', [
    addr.AAVE_POLYGON_POOL,
    addr.aPolWMATIC,
    addr.WMATIC_TOKEN,
    factory.options.address,
    'Sticky WMATIC Aave Pool',
    'stickyWMATIC'
  ]);
  const wmaticHelper = await loadContract('wmaticHelper', 'UniswapV2Helper', [
    addr.MATIC_FEED, // input
    addr.USDC_FEED, // output
    addr.WMATIC_USDC_POOL,
    addr.WMATIC_TOKEN, // input
    addr.USDC_TOKEN, // output
    99, 100 // slippage
  ]);
  await addPool(factory, wmaticPool, wmaticHelper);

})();

async function addPool(factory, pool, helper) {
  const existing = await fetchPools(factory);
  if(existing.indexOf(pool.options.address.toLowerCase()) !== -1) {
    console.log('Skipping pool creation...');
    return;
  }
  await factory.methods.addPool(
    pool.options.address,
    helper ? helper.options.address : addr.BURN
  ).send({
    from: signer.address,
    gas: chainParams.gas,
    gasPrice: chainParams.gasPrice
  });
}

async function fetchPools(factory) {
  const count = Number(await factory.methods.poolsCount().call());
  const out = [];
  for(let i = 0; i<count; i++) {
    out.push((await factory.methods.pools(i).call()).toLowerCase());
  }
  return out;
}

async function loadContract(key, name, args) {
  // Don't redeploy if it's already existing
  if(config[key]) {
    const abi = JSON.parse(fs.readFileSync(`${BUILD_DIR}${name}.abi`, { encoding: 'utf8' }));
    return new web3.eth.Contract(abi, config[key]);
  }

  return await deployContract(name, args);
}

async function deployContract(name, args) {
  const bytecode = fs.readFileSync(`${BUILD_DIR}${name}.bin`, { encoding: 'utf8' });
  const abi = JSON.parse(fs.readFileSync(`${BUILD_DIR}${name}.abi`, { encoding: 'utf8' }));
  const contract = new web3.eth.Contract(abi);
  const deployTx = contract.deploy({
    data: bytecode,
    arguments: args
  });
  const gas = chainParams.gas;
  const balance = await web3.eth.getBalance(signer.address);
  console.log('gas: ', gas, 'fee: ', gas*chainParams.gasPrice, 'balance: ', balance, signer.address);
  const deployedContract = await deployTx
    .send({
      from: signer.address,
      gas,
      gasPrice: chainParams.gasPrice
    })
    .once("transactionHash", (txhash) => {
      console.log(`Mining deployment transaction ...`);
      console.log(chainParams.explorer + txhash);
    });
  // The contract is now deployed on chain!
  console.log(`Contract "${name}" deployed at ${deployedContract.options.address}`);
  return deployedContract;
}

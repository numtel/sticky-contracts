const assert = require('assert');

exports.swap0To1 = async function({
  web3, accounts, deployContract, loadContract, throws, BURN_ACCOUNT, increaseTime,
}) {
  const token0 = await deployContract(accounts[0], 'MockERC20');
  const token1 = await deployContract(accounts[0], 'MockERC20');
  const feed0 = await deployContract(accounts[0], 'MockChainlinkFeed');
  const feed1 = await deployContract(accounts[0], 'MockChainlinkFeed');
  const pool = await deployContract(accounts[0], 'MockUniswapV2Pair',
    token0.options.address, token1.options.address);

  const helper = await deployContract(accounts[0], 'UniswapV2Helper',
    feed0.options.address, feed1.options.address, pool.options.address,
    token0.options.address, token1.options.address,
    90, 100
  );


  await token0.sendFrom(accounts[0]).mint(helper.options.address, 1000);
  await helper.sendFrom(accounts[0]).swap(accounts[1]);
  assert.strictEqual(
    Number(await token1.methods.balanceOf(accounts[1]).call()),
    1000
  );

  // Change prices
  await feed0.sendFrom(accounts[0]).setAnswer(4);
  await feed1.sendFrom(accounts[0]).setAnswer(8);
  await pool.sendFrom(accounts[0]).setPrices(4, 8);

  await token0.sendFrom(accounts[0]).mint(helper.options.address, 1000);
  await helper.sendFrom(accounts[0]).swap(accounts[2]);
  assert.strictEqual(
    Number(await token1.methods.balanceOf(accounts[2]).call()),
    500
  );

  // Introduce slippage at limit
  await pool.sendFrom(accounts[0]).setPrices(4000 * 0.9, 8000);
  await token0.sendFrom(accounts[0]).mint(helper.options.address, 1000);
  await helper.sendFrom(accounts[0]).swap(accounts[3]);
  assert.strictEqual(
    Number(await token1.methods.balanceOf(accounts[3]).call()),
    450
  );

  // Introduce slippage below limit
  await pool.sendFrom(accounts[0]).setPrices(4000 * 0.8, 8000);
  await token0.sendFrom(accounts[0]).mint(helper.options.address, 1000);
  assert.strictEqual(await throws(() =>
    helper.sendFrom(accounts[0]).swap(accounts[4])), true);
}

exports.swap1To0 = async function({
  web3, accounts, deployContract, loadContract, throws, BURN_ACCOUNT, increaseTime,
}) {
  const token0 = await deployContract(accounts[0], 'MockERC20');
  const token1 = await deployContract(accounts[0], 'MockERC20');
  const feed0 = await deployContract(accounts[0], 'MockChainlinkFeed');
  const feed1 = await deployContract(accounts[0], 'MockChainlinkFeed');
  const pool = await deployContract(accounts[0], 'MockUniswapV2Pair',
    token0.options.address, token1.options.address);

  const helper = await deployContract(accounts[0], 'UniswapV2Helper',
    feed1.options.address, feed0.options.address, pool.options.address,
    token1.options.address, token0.options.address,
    90, 100
  );


  await token1.sendFrom(accounts[0]).mint(helper.options.address, 1000);
  await helper.sendFrom(accounts[0]).swap(accounts[1]);
  assert.strictEqual(
    Number(await token0.methods.balanceOf(accounts[1]).call()),
    1000
  );

  // Change prices
  await feed0.sendFrom(accounts[0]).setAnswer(4);
  await feed1.sendFrom(accounts[0]).setAnswer(8);
  await pool.sendFrom(accounts[0]).setPrices(4, 8);

  await token1.sendFrom(accounts[0]).mint(helper.options.address, 1000);
  await helper.sendFrom(accounts[0]).swap(accounts[2]);
  assert.strictEqual(
    Number(await token0.methods.balanceOf(accounts[2]).call()),
    2000
  );

  // Introduce slippage at limit
  await pool.sendFrom(accounts[0]).setPrices(4000, 8000 * 0.9);
  await token1.sendFrom(accounts[0]).mint(helper.options.address, 1000);
  await helper.sendFrom(accounts[0]).swap(accounts[3]);
  assert.strictEqual(
    Number(await token0.methods.balanceOf(accounts[3]).call()),
    1800
  );

  // Introduce slippage below limit
  await pool.sendFrom(accounts[0]).setPrices(4000, 8000 * 0.8);
  await token1.sendFrom(accounts[0]).mint(helper.options.address, 1000);
  assert.strictEqual(await throws(() =>
    helper.sendFrom(accounts[0]).swap(accounts[4])), true);
}

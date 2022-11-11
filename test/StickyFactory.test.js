const assert = require('assert');
const {MerkleTree} = require('merkletreejs');
const keccak256 = require('keccak256');

exports.canInvestAndWithdraw = async function({
  web3, accounts, deployContract, loadContract, throws, BURN_ACCOUNT, increaseTime,
}) {
  const REWARD_RATIO = 3; // must be integer
  const mockToken = await deployContract(accounts[0], 'MockERC20');
  const rewardToken = await deployContract(accounts[0], 'MockERC20');
  const swapHelper = await deployContract(accounts[0], 'MockSwapHelper',
    mockToken.options.address, rewardToken.options.address, REWARD_RATIO);
  const mockAToken = await deployContract(accounts[0], 'MockAToken', 10, 10);
  const mockAavePool = await deployContract(accounts[0], 'MockPool',
    mockToken.options.address, mockAToken.options.address);

  const factory = await deployContract(accounts[0], 'StickyFactory',
    rewardToken.options.address);

  const pool = await deployContract(accounts[0], 'StickyAavePool',
    mockAavePool.options.address,
    mockAToken.options.address,
    mockToken.options.address,
    factory.options.address,
    'Sticky TEST Aave Pool',
    'stickyTEST',
  );

  const result = await factory.sendFrom(accounts[0]).addPool(
    pool.options.address,
    swapHelper.options.address
  );

  const INVESTOR_AMOUNT = 10000;
  await mockToken.sendFrom(accounts[0]).mint(accounts[0], INVESTOR_AMOUNT);
  await mockToken.sendFrom(accounts[0]).approve(pool.options.address, INVESTOR_AMOUNT);
  await pool.sendFrom(accounts[0]).mint(INVESTOR_AMOUNT);

  assert.strictEqual(await mockToken.methods.balanceOf(accounts[0]).call(), '0');

  assert.strictEqual(Number(await mockAToken.methods.balanceOf(pool.options.address).call()), INVESTOR_AMOUNT);

  await mockAToken.sendFrom(accounts[0]).setScaleNumerator(11);

  assert.strictEqual(Number(await mockAToken.methods.balanceOf(pool.options.address).call()), INVESTOR_AMOUNT * 1.1);
  assert.strictEqual(Number(await pool.methods.interestAvailable().call()), INVESTOR_AMOUNT * 0.1);

  const rewardData = [
    { acct: accounts[1], share: 100 },
    { acct: accounts[2], share: 200 },
    { acct: accounts[3], share: 300 },
    { acct: accounts[4], share: 400 },
  ];
  const epochTotal = rewardData.reduce((prev, cur) => prev + cur.share, 0);

  // Create the epoch
  await factory.sendFrom(accounts[0]).defineEpoch();
  await factory.sendFrom(accounts[0]).collectInterest(0, 0, 100);
  // Called after finishing interest collection
  const newEpochResult = await factory.sendFrom(accounts[0]).emitNewEpoch();
  const expectedInterest = INVESTOR_AMOUNT * 0.1 * REWARD_RATIO;
  assert.strictEqual(Number(newEpochResult.events.NewEpoch.returnValues.interestEarned), expectedInterest);

  // Interest was collected in factory
  assert.strictEqual(
    Number(await rewardToken.methods.balanceOf(factory.options.address).call()),
    expectedInterest
  );

  await factory.sendFrom(accounts[0]).distributeInterest(
    rewardToken.options.address,
    rewardData.map(item =>
      [ item.acct, item.share * expectedInterest / epochTotal ]));

  for(let i = 0; i < rewardData.length; i++) {
    // Account balance equals the share of the earned interest
    assert.strictEqual(
      Number(await rewardToken.methods.balanceOf(rewardData[i].acct).call()),
      INVESTOR_AMOUNT * 0.1 * (rewardData[i].share / epochTotal) * REWARD_RATIO
    );
  }

}

exports.changeRewardTokenAndOracle = async function({
  web3, accounts, deployContract, loadContract, throws, BURN_ACCOUNT, increaseTime,
}) {
  const REWARD_RATIO = 3; // must be integer
  const REWARD_RATIO2 = 5; // must be integer
  const mockToken = await deployContract(accounts[0], 'MockERC20');
  const rewardToken = await deployContract(accounts[0], 'MockERC20');
  const swapHelper = await deployContract(accounts[0], 'MockSwapHelper',
    mockToken.options.address, rewardToken.options.address, REWARD_RATIO);
  const rewardToken2 = await deployContract(accounts[0], 'MockERC20');
  const swapHelper2 = await deployContract(accounts[0], 'MockSwapHelper',
    mockToken.options.address, rewardToken2.options.address, REWARD_RATIO2);
  const mockAToken = await deployContract(accounts[0], 'MockAToken', 10, 10);
  const mockAavePool = await deployContract(accounts[0], 'MockPool',
    mockToken.options.address, mockAToken.options.address);

  const factory = await deployContract(accounts[0], 'StickyFactory',
    rewardToken.options.address);

  const pool = await deployContract(accounts[0], 'StickyAavePool',
    mockAavePool.options.address,
    mockAToken.options.address,
    mockToken.options.address,
    factory.options.address,
    'Sticky TEST Aave Pool',
    'stickyTEST',
  );

  const result = await factory.sendFrom(accounts[0]).addPool(
    pool.options.address,
    swapHelper.options.address
  );

  const INVESTOR_AMOUNT = 10000;
  await mockToken.sendFrom(accounts[0]).mint(accounts[0], INVESTOR_AMOUNT);
  await mockToken.sendFrom(accounts[0]).approve(pool.options.address, INVESTOR_AMOUNT);
  await pool.sendFrom(accounts[0]).mint(INVESTOR_AMOUNT);

  assert.strictEqual(await mockToken.methods.balanceOf(accounts[0]).call(), '0');

  assert.strictEqual(Number(await mockAToken.methods.balanceOf(pool.options.address).call()), INVESTOR_AMOUNT);

  await mockAToken.sendFrom(accounts[0]).setScaleNumerator(11);

  assert.strictEqual(Number(await mockAToken.methods.balanceOf(pool.options.address).call()), INVESTOR_AMOUNT * 1.1);
  assert.strictEqual(Number(await pool.methods.interestAvailable().call()), INVESTOR_AMOUNT * 0.1);

  const leafData = [
    { acct: accounts[1], share: 100 },
    { acct: accounts[2], share: 200 },
    { acct: accounts[3], share: 300 },
    { acct: accounts[4], share: 400 },
  ];
  const epochTotal = leafData.reduce((prev, cur) => prev + cur.share, 0);

  await factory.sendFrom(accounts[0]).defineEpoch();
  await factory.sendFrom(accounts[0]).collectInterest(0, 0, 100);
  // Called after finishing interest collection
  const newEpochResult = await factory.sendFrom(accounts[0]).emitNewEpoch();
  assert.strictEqual(Number(newEpochResult.events.NewEpoch.returnValues.interestEarned), INVESTOR_AMOUNT * 0.1 * REWARD_RATIO);

  // Create a second epoch, account orders must stay same for assertion loop below
  const leafData2 = [
    { acct: accounts[1], share: 104 },
    { acct: accounts[2], share: 203 },
    { acct: accounts[3], share: 302 },
    { acct: accounts[4], share: 401 },
  ];
  const epochTotal2 = leafData2.reduce((prev, cur) => prev + cur.share, 0);

  // Change the reward token
  await factory.sendFrom(accounts[0]).setRewardToken(rewardToken2.options.address);
  // Change the oracle account
  await factory.sendFrom(accounts[0]).setOracleAccount(accounts[1]);
  // Fake some interest generated
  const hiddenBalance = Number(await mockAToken.methods._balanceOf(pool.options.address).call());
  await mockAToken.sendFrom(accounts[0]).setScaleNumerator(13);
  // This is conforming to the MockAToken
  const poolTotal = Math.floor(hiddenBalance * 13 / 10);

  const epochCount = await factory.methods.epochsCount().call();
  // Fails from old oracle
  assert.strictEqual(await throws(() =>
    factory.sendFrom(accounts[0]).defineEpoch()), true);

  // Succeeds from new oracle
  await factory.sendFrom(accounts[1]).defineEpoch();

  // Need to update swapHelper to match the new reward token
  assert.strictEqual(await throws(() =>
    factory.sendFrom(accounts[0]).collectInterest(epochCount, 0, 100)), true);

  const swapHelperResult = await factory.sendFrom(accounts[0]).setSwapHelper(0, swapHelper2.options.address);
  assert.strictEqual(
    swapHelperResult.events.SwapHelperChanged.returnValues.oldHelper,
    swapHelper.options.address
  );
  assert.strictEqual(
    swapHelperResult.events.SwapHelperChanged.returnValues.newHelper,
    swapHelper2.options.address
  );

  // Fails from old oracle
  assert.strictEqual(await throws(() =>
    factory.sendFrom(accounts[0]).collectInterest(epochCount, 0, 100)), true);
  // Interest collection now succeeds
  await factory.sendFrom(accounts[1]).collectInterest(epochCount, 0, 100);

  // Fails from old oracle
  assert.strictEqual(await throws(() =>
    factory.sendFrom(accounts[0]).emitNewEpoch()), true);
  // Called after finishing interest collection
  const newEpochResult2 = await factory.sendFrom(accounts[1]).emitNewEpoch();
  assert.strictEqual(newEpochResult2.events.NewEpoch.returnValues.rewardToken, rewardToken2.options.address);
  assert.strictEqual(Number(newEpochResult2.events.NewEpoch.returnValues.interestEarned), (poolTotal - INVESTOR_AMOUNT) * REWARD_RATIO2);

  // Interest was collected in factory
  const rewardTokenExpected = INVESTOR_AMOUNT * 0.1 * REWARD_RATIO;
  const rewardToken2Expected = (poolTotal - INVESTOR_AMOUNT) * REWARD_RATIO2;

  assert.strictEqual(
    Number(await rewardToken.methods.balanceOf(factory.options.address).call()),
    rewardTokenExpected
  );
  assert.strictEqual(
    Number(await rewardToken2.methods.balanceOf(factory.options.address).call()),
    rewardToken2Expected
  );

  await factory.sendFrom(accounts[1]).distributeInterest(
    rewardToken.options.address,
    leafData.map(item =>
      [ item.acct, Math.floor(item.share * rewardTokenExpected / epochTotal) ]));
  await factory.sendFrom(accounts[1]).distributeInterest(
    rewardToken2.options.address,
    leafData2.map(item =>
      [ item.acct, Math.floor(item.share * rewardToken2Expected / epochTotal2) ]));

  for(let i = 0; i < leafData.length; i++) {
    // Account balance equals the share of the earned interest
    assert.strictEqual(
      Number(await rewardToken.methods.balanceOf(leafData[i].acct).call()),
      INVESTOR_AMOUNT * 0.1 * (leafData[i].share / epochTotal) * REWARD_RATIO
    );
    assert.strictEqual(
      Number(await rewardToken2.methods.balanceOf(leafData2[i].acct).call()),
      Math.floor((poolTotal - INVESTOR_AMOUNT) * (leafData2[i].share / epochTotal2) * REWARD_RATIO2)
    );
  }

}

exports.poolInterestIsReward = async function({
  web3, accounts, deployContract, loadContract, throws, BURN_ACCOUNT, increaseTime,
}) {
  const mockToken = await deployContract(accounts[0], 'MockERC20');
  const mockAToken = await deployContract(accounts[0], 'MockAToken', 10, 10);
  const mockAavePool = await deployContract(accounts[0], 'MockPool',
    mockToken.options.address, mockAToken.options.address);

  const factory = await deployContract(accounts[0], 'StickyFactory',
    mockToken.options.address);

  const pool = await deployContract(accounts[0], 'StickyAavePool',
    mockAavePool.options.address,
    mockAToken.options.address,
    mockToken.options.address,
    BURN_ACCOUNT,
    'Sticky TEST Aave Pool',
    'stickyTEST',
  );

  const result = await factory.sendFrom(accounts[0]).addPool(
    pool.options.address,
    BURN_ACCOUNT
  );

  const INVESTOR_AMOUNT = 10000;
  await mockToken.sendFrom(accounts[0]).mint(accounts[0], INVESTOR_AMOUNT);
  await mockToken.sendFrom(accounts[0]).approve(pool.options.address, INVESTOR_AMOUNT);
  await pool.sendFrom(accounts[0]).mint(INVESTOR_AMOUNT);

  await mockAToken.sendFrom(accounts[0]).setScaleNumerator(11);

  const leafData = [
    { acct: accounts[1], share: 100 },
    { acct: accounts[2], share: 200 },
    { acct: accounts[3], share: 300 },
    { acct: accounts[4], share: 400 },
  ];
  const epochTotal = leafData.reduce((prev, cur) => prev + cur.share, 0);

  await factory.sendFrom(accounts[0]).defineEpoch();

  // Fails with incorrect factory setting
  assert.strictEqual(await throws(() =>
    factory.sendFrom(accounts[0]).collectInterest(0, 0, 100)), true);

  await pool.sendFrom(accounts[0]).setFactory(factory.options.address);
  await factory.sendFrom(accounts[0]).collectInterest(0, 0, 100);
  // Called after finishing interest collection
  const newEpochResult = await factory.sendFrom(accounts[0]).emitNewEpoch();
  assert.strictEqual(Number(newEpochResult.events.NewEpoch.returnValues.interestEarned), INVESTOR_AMOUNT * 0.1);

  // Interest was collected in factory
  const expectedInterest = INVESTOR_AMOUNT * 0.1;
  assert.strictEqual(
    Number(await mockToken.methods.balanceOf(factory.options.address).call()),
    expectedInterest
  );

  await factory.sendFrom(accounts[0]).distributeInterest(
    mockToken.options.address,
    leafData.map(item =>
      [ item.acct, Math.floor(item.share * expectedInterest / epochTotal) ]));

  for(let i = 0; i < leafData.length; i++) {
    // Account balance equals the share of the earned interest
    assert.strictEqual(
      Number(await mockToken.methods.balanceOf(leafData[i].acct).call()),
      expectedInterest * (leafData[i].share / epochTotal)
    );
  }

}

exports.multipleEpochsAndPools = async function({
  web3, accounts, deployContract, loadContract, throws, BURN_ACCOUNT, increaseTime,
}) {
  const REWARD_RATIO1 = 3; // must be integer
  const REWARD_RATIO2 = 5; // must be integer
  const mockToken = await deployContract(accounts[0], 'MockERC20');
  const rewardToken = await deployContract(accounts[0], 'MockERC20');
  const swapHelper = await deployContract(accounts[0], 'MockSwapHelper',
    mockToken.options.address, rewardToken.options.address, REWARD_RATIO1);
  const mockAToken = await deployContract(accounts[0], 'MockAToken', 10, 10);
  const mockAavePool = await deployContract(accounts[0], 'MockPool',
    mockToken.options.address, mockAToken.options.address);

  const mockToken2 = await deployContract(accounts[0], 'MockERC20');
  const swapHelper2 = await deployContract(accounts[0], 'MockSwapHelper',
    mockToken2.options.address, rewardToken.options.address, REWARD_RATIO2);
  const mockAToken2 = await deployContract(accounts[0], 'MockAToken', 10, 10);
  const mockAavePool2 = await deployContract(accounts[0], 'MockPool',
    mockToken2.options.address, mockAToken2.options.address);

  const factory = await deployContract(accounts[0], 'StickyFactory',
    rewardToken.options.address);

  const pool = await deployContract(accounts[0], 'StickyAavePool',
    mockAavePool.options.address,
    mockAToken.options.address,
    mockToken.options.address,
    factory.options.address,
    'Sticky TEST Aave Pool',
    'stickyTEST',
  );

  const pool2 = await deployContract(accounts[0], 'StickyAavePool',
    mockAavePool2.options.address,
    mockAToken2.options.address,
    mockToken2.options.address,
    factory.options.address,
    'Sticky TEST2 Aave Pool',
    'stickyTEST2',
  );

  await factory.sendFrom(accounts[0]).addPool(
    pool.options.address,
    swapHelper.options.address
  );
  await factory.sendFrom(accounts[0]).addPool(
    pool2.options.address,
    swapHelper2.options.address
  );

  const INVESTOR_AMOUNT = 10000;
  await mockToken.sendFrom(accounts[0]).mint(accounts[0], INVESTOR_AMOUNT);
  await mockToken.sendFrom(accounts[0]).approve(pool.options.address, INVESTOR_AMOUNT);
  await pool.sendFrom(accounts[0]).mint(INVESTOR_AMOUNT);

  await mockToken2.sendFrom(accounts[0]).mint(accounts[0], INVESTOR_AMOUNT);
  await mockToken2.sendFrom(accounts[0]).approve(pool2.options.address, INVESTOR_AMOUNT);
  await pool2.sendFrom(accounts[0]).mint(INVESTOR_AMOUNT);

  await mockAToken.sendFrom(accounts[0]).setScaleNumerator(11);
  await mockAToken2.sendFrom(accounts[0]).setScaleNumerator(12);

  assert.strictEqual(Number(await pool.methods.interestAvailable().call()), INVESTOR_AMOUNT * 0.1);
  assert.strictEqual(Number(await pool2.methods.interestAvailable().call()), INVESTOR_AMOUNT * 0.2);

  const leafData = [
    { acct: accounts[1], share: 100 },
    { acct: accounts[2], share: 200 },
    { acct: accounts[3], share: 300 },
    { acct: accounts[4], share: 400 },
  ];
  const epochTotal = leafData.reduce((prev, cur) => prev + cur.share, 0);

  await factory.sendFrom(accounts[0]).defineEpoch();
  await factory.sendFrom(accounts[0]).collectInterest(0, 0, 100);
  const expectedInterest1 =
    (INVESTOR_AMOUNT * 0.1 * REWARD_RATIO1) + (INVESTOR_AMOUNT * 0.2 * REWARD_RATIO2);
  // Called after finishing interest collection
  const newEpochResult = await factory.sendFrom(accounts[0]).emitNewEpoch();
  assert.strictEqual(Number(newEpochResult.events.NewEpoch.returnValues.interestEarned),
    expectedInterest1);

  // Make a second epoch
  const hiddenBalance = Number(await mockAToken.methods._balanceOf(pool.options.address).call());
  const hiddenBalance2 = Number(await mockAToken2.methods._balanceOf(pool2.options.address).call());
  await mockAToken.sendFrom(accounts[0]).setScaleNumerator(13);
  await mockAToken2.sendFrom(accounts[0]).setScaleNumerator(15);
  // This is conforming to the MockAToken
  const pool1Total = Math.floor(hiddenBalance * 13 / 10);
  const pool2Total = Math.floor(hiddenBalance2 * 15 / 10);
  assert.strictEqual(Number(await mockAToken.methods.balanceOf(pool.options.address).call()), pool1Total);

  assert.strictEqual(Number(await pool.methods.interestAvailable().call()), pool1Total - INVESTOR_AMOUNT);
  assert.strictEqual(Number(await pool2.methods.interestAvailable().call()), pool2Total - INVESTOR_AMOUNT);

  // This test expects the accounts to be in the same order,
  //  only shares differ between epochs
  const leafData2 = [
    { acct: accounts[1], share: 500 },
    { acct: accounts[2], share: 300 },
    { acct: accounts[3], share: 20 },
    { acct: accounts[4], share: 10 },
  ];
  const epochTotal2 = leafData2.reduce((prev, cur) => prev + cur.share, 0);

  await factory.sendFrom(accounts[0]).defineEpoch();
  await factory.sendFrom(accounts[0]).collectInterest(1, 0, 100);
  const expectedInterest2 =
    ((pool1Total - INVESTOR_AMOUNT) * REWARD_RATIO1) + ((pool2Total - INVESTOR_AMOUNT) * REWARD_RATIO2);
  // Called after finishing interest collection
  const newEpochResult2 = await factory.sendFrom(accounts[0]).emitNewEpoch();
  assert.strictEqual(Number(newEpochResult2.events.NewEpoch.returnValues.interestEarned),
    expectedInterest2);

  const rewards = leafData.map((_, i) => Math.floor(
    ((INVESTOR_AMOUNT * 0.1 * REWARD_RATIO1) + (INVESTOR_AMOUNT * 0.2 * REWARD_RATIO2))
      * (leafData[i].share / epochTotal) +
    Math.floor(
      (((pool1Total - INVESTOR_AMOUNT) * REWARD_RATIO1) + ((pool2Total - INVESTOR_AMOUNT) * REWARD_RATIO2))
        * (leafData2[i].share / epochTotal2)
    )
   ));

  await factory.sendFrom(accounts[0]).distributeInterest(
    rewardToken.options.address,
    leafData.map((item, i) => [ item.acct, rewards[i] ]));

  for(let i = 0; i < leafData.length; i++) {
    // Account balance equals the share of the earned interest
    assert.strictEqual(
      Number(await rewardToken.methods.balanceOf(leafData[i].acct).call()),
      rewards[i]
    );
  }

}

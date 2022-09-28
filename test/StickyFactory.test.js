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

  const leafData = [
    { acct: accounts[1], share: 100 },
    { acct: accounts[2], share: 200 },
    { acct: accounts[3], share: 300 },
    { acct: accounts[4], share: 400 },
  ];
  const leaves = leafData.map(leaf => keccak256(
    Buffer.from(web3.utils.encodePacked(
      {value: leaf.acct, type:'address'},
      {value: leaf.share, type:'uint256'}
    ).slice(2), 'hex')
  ));
  const epochTotal = leafData.reduce((prev, cur) => prev + cur.share, 0);

  // Generate the tree
  const tree = new MerkleTree(leaves, keccak256, {sort:true});
  const root = tree.getHexRoot();

  // Publish the epoch merkle root
  await factory.sendFrom(accounts[0]).defineEpoch(root, epochTotal);
  await factory.sendFrom(accounts[0]).collectInterest(0, 0, 100);
  // Called after finishing interest collection
  const newEpochResult = await factory.sendFrom(accounts[0]).emitNewEpoch();
  assert.strictEqual(Number(newEpochResult.events.NewEpoch.returnValues.interestEarned), INVESTOR_AMOUNT * 0.1 * REWARD_RATIO);

  // Interest was collected in factory
  assert.strictEqual(
    Number(await rewardToken.methods.balanceOf(factory.options.address).call()),
    INVESTOR_AMOUNT * 0.1 * REWARD_RATIO
  );

  for(let i = 0; i < leafData.length; i++) {
    // Claim is valid with the correct share value
    assert.strictEqual(await factory.methods.claimProofValid(
      leafData[i].acct,
      [0, leafData[i].share, tree.getHexProof(leaves[i])]
    ).call(), true);
    // Claim fails when the share value does not match
    assert.strictEqual(await factory.methods.claimProofValid(
      leafData[i].acct,
      [0, leafData[i].share*2, tree.getHexProof(leaves[i])]
    ).call(), false);

    await factory.sendFrom(leafData[i].acct).claimReward([
      [0, leafData[i].share, tree.getHexProof(leaves[i])]
    ]);

    // Cannot claim same epoch twice
    assert.strictEqual(await throws(() =>
      factory.sendFrom(leafData[i].acct).claimReward([
        [0, leafData[i].share, tree.getHexProof(leaves[i])]
      ])
    ), true);

    // Account balance equals the share of the earned interest
    assert.strictEqual(
      Number(await rewardToken.methods.balanceOf(leafData[i].acct).call()),
      INVESTOR_AMOUNT * 0.1 * (leafData[i].share / epochTotal) * REWARD_RATIO
    );
  }

}

// TODO test setRewardToken, setSwapHelper
// TODO test setOracleAccount
// TODO test multiple epochs, pools
// TODO test FactoryChanged
// TODO test pool that earns interest in rewardToken

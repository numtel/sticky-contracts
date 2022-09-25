const assert = require('assert');
const {MerkleTree} = require('merkletreejs');
const keccak256 = require('keccak256');

exports.canInvestAndWithdraw = async function({
  web3, accounts, deployContract, loadContract, throws, BURN_ACCOUNT, increaseTime,
}) {
  const mockToken = await deployContract(accounts[0], 'MockERC20');
  const mockAToken = await deployContract(accounts[0], 'MockAToken', 10, 10);
  const mockPool = await deployContract(accounts[0], 'MockPool',
    mockToken.options.address, mockAToken.options.address);

  const skimmer = await deployContract(accounts[0], 'StickyInterestSkimmer',
    mockPool.options.address,
    mockAToken.options.address,
    mockToken.options.address,
    0);

  const INVESTOR_AMOUNT = 10000;
  await mockToken.sendFrom(accounts[0]).mint(accounts[0], INVESTOR_AMOUNT);
  await mockToken.sendFrom(accounts[0]).approve(skimmer.options.address, INVESTOR_AMOUNT);
  await skimmer.sendFrom(accounts[0]).deposit(INVESTOR_AMOUNT);

  assert.strictEqual(await mockToken.methods.balanceOf(accounts[0]).call(), '0');

  assert.strictEqual(Number(await mockAToken.methods.balanceOf(skimmer.options.address).call()), INVESTOR_AMOUNT);

  await mockAToken.sendFrom(accounts[0]).setScaleNumerator(11);

  assert.strictEqual(Number(await mockAToken.methods.balanceOf(skimmer.options.address).call()), INVESTOR_AMOUNT * 1.1);

  await skimmer.sendFrom(accounts[0]).mint(accounts[1], 100);

  assert.strictEqual(Number(await skimmer.methods.creatorAvailable(accounts[1]).call()), INVESTOR_AMOUNT * 0.1);


  // Can't withdraw more than deposited
  assert.strictEqual(await throws(() =>
    skimmer.sendFrom(accounts[0]).withdraw(INVESTOR_AMOUNT * 2)), true);

  await skimmer.sendFrom(accounts[0]).withdraw(INVESTOR_AMOUNT);
  assert.strictEqual(Number(await mockToken.methods.balanceOf(accounts[0]).call()), INVESTOR_AMOUNT);


};


exports.merkleClaim = async function({
  web3, accounts, deployContract, loadContract, throws, BURN_ACCOUNT, increaseTime,
}) {
  const mockToken = await deployContract(accounts[0], 'MockERC20');
  const mockAToken = await deployContract(accounts[0], 'MockAToken', 10, 10);
  const mockPool = await deployContract(accounts[0], 'MockPool',
    mockToken.options.address, mockAToken.options.address);

  const skimmer = await deployContract(accounts[0], 'StickyInterestSkimmer',
    mockPool.options.address,
    mockAToken.options.address,
    mockToken.options.address,
    0);

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

  // Generate the tree
  const tree = new MerkleTree(leaves, keccak256, {sort:true});
  const root = tree.getHexRoot();

  // Publish the epoch merkle root
  await skimmer.sendFrom(accounts[0]).publishEpochRoot(root);


  for(let i = 0; i < leafData.length; i++) {
    // Claim is valid with the correct share value
    assert.strictEqual(await skimmer.methods.claimValid(0, leafData[i].share, tree.getHexProof(leaves[i])).call({from:leafData[i].acct}), true);
    // Claim fails when the share value does not match
    assert.strictEqual(await skimmer.methods.claimValid(0, leafData[i].share * 2, tree.getHexProof(leaves[i])).call({from:leafData[i].acct}), false);
  }

}

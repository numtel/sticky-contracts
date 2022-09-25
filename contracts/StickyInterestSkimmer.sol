// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./IERC20.sol";
import "./IPool.sol";
// TODO Ownable superclass causing deployment error?
import "./Ownable.sol";
import "./safeTransfer.sol";

contract StickyInterestSkimmer is Ownable {
  uint public creatorTotalSupply;
  mapping(address => uint) public creatorBalanceOf;

  uint public investorTotalSupply;
  mapping(address => uint) public investorBalanceOf;

  bytes32[] public epochRoots;

  IPool public pool;
  // The Aave token
  IERC20 public aToken;
  // The underlying asset
  IERC20 public baseToken;
  // NYI, always use 0 for now
  // 0-0xffffffff: 0-100% of interest goes to investors
  uint32 public investorProportion;

  constructor(
    IPool _pool,
    IERC20 _aToken,
    IERC20 _baseToken,
    uint32 _investorProportion
  ) {
    pool = _pool;
    aToken = _aToken;
    baseToken = _baseToken;
    investorProportion = _investorProportion;
    _transferOwnership(msg.sender);
    //owner = msg.sender;
  }

  // Invoked by investors
  // Underlying asset must have approved the transfer already to this contract
  function deposit(uint amountIn) external {
    investorBalanceOf[msg.sender] += amountIn;
    investorTotalSupply += amountIn;
    safeTransfer.invokeFrom(address(baseToken), msg.sender, address(this), amountIn);
    baseToken.approve(address(pool), amountIn);
    pool.deposit(address(baseToken), amountIn, address(this), 0);
  }

  // Invoked by investors
  function withdraw(uint amountOut) external {
    require(investorBalanceOf[msg.sender] >= amountOut);
    investorBalanceOf[msg.sender] -= amountOut;
    investorTotalSupply -= amountOut;
    pool.withdraw(address(baseToken), amountOut, msg.sender);
  }

  // NYI
  // Invoked by investors
  function investorAvailable(address account) public view {
  }

  // NYI
  // Invoked by investors
  function investorClaim() external {
  }

  // Owner invokes for content creators, acting as oracle
  function mint(address account, uint amount) external onlyOwner {
    creatorBalanceOf[account] += amount;
    creatorTotalSupply += amount;
  }

  // Owner invokes for content creators, acting as oracle
  function burn(address account, uint amount) external onlyOwner {
    creatorBalanceOf[account] -= amount;
    creatorTotalSupply -= amount;
  }

  // Invoked by creators
  function creatorClaim() external {
    pool.withdraw(address(baseToken), creatorAvailable(msg.sender), msg.sender);
  }

  // Invoked by creators
  function creatorAvailable(address account) public view returns (uint) {
    uint totalAvailable = aToken.balanceOf(address(this)) - investorTotalSupply;
    return (creatorBalanceOf[account] * totalAvailable) / creatorTotalSupply;
  }

  // Administrative only
  function transferOwnership(address newOwner) external onlyOwner {
    //owner = newOwner;
  }

  // Administrative only
  // XXX: Any pending (unclaimed) interest will be modified by this function
  function setInvestorProportion(uint32 newValue) external onlyOwner {
    investorProportion = newValue;
  }

  // From https://github.com/miguelmota/merkletreejs-solidity
  function verify(
    bytes32 root,
    bytes32 leaf,
    bytes32[] memory proof
  )
    internal
    pure
    returns (bool)
  {
    bytes32 computedHash = leaf;

    for (uint256 i = 0; i < proof.length; i++) {
      bytes32 proofElement = proof[i];

      if (computedHash <= proofElement) {
        // Hash(current computed hash + current element of the proof)
        computedHash = keccak256(abi.encodePacked(computedHash, proofElement));
      } else {
        // Hash(current element of the proof + current computed hash)
        computedHash = keccak256(abi.encodePacked(proofElement, computedHash));
      }
    }

    // Check if the computed hash (root) is equal to the provided root
    return computedHash == root;
  }

  function publishEpochRoot(bytes32 root) external onlyOwner {
    epochRoots.push(root);
  }

  function claimValid(uint epoch, uint share, bytes32[] memory proof) external view returns(bool) {
    bytes32 leaf = keccak256(abi.encodePacked(msg.sender, share));
    return verify(epochRoots[epoch], leaf, proof);
  }
}

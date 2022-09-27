// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./ERC20.sol";
import "./IPool.sol";
import "./Ownable.sol";
import "./safeTransfer.sol";


contract StickyFactory is Ownable {
  StickyPool[] public pools;
  mapping(address => uint) public lastClaimedEpochOf;
  bytes32[] public epochRoots;
  uint[] public epochTotals;
  uint[] public epochInterest;
  address public oracle;

  struct ClaimRewards {
    uint epochIndex;
    uint shareAmount;
    bytes32[] proof;
  }

  event OracleChanged(address indexed oldOracle, address indexed newOracle);
  event NewPool(address indexed stickyPool, address indexed baseToken);

  constructor() {
    _transferOwnership(msg.sender);
    oracle = msg.sender;
  }

  function createPool(
    IPool aavePool,
    address aToken,
    address baseToken
  ) external onlyOwner {
    StickyPool newPool = new StickyPool(aavePool, aToken, baseToken);
    pools.push(newPool);
    emit NewPool(address(newPool), baseToken);
  }

  function initiateEpoch(bytes32 epochRoot, uint epochTotal) external {
    require(msg.sender == oracle);
    epochRoots.push(epochRoot);
    epochTotals.push(epochTotal);
    // Swap each pool interest into rewards token
    // TODO support multiple pools!
    for(uint i = 0; i<pools.length; i++) {
      // TODO epochInterest should be in rewards token after swap!
      epochInterest.push(pools[i].interestAvailable());
      pools[i].collectInterest();
    }
  }

  function setOracleAccount(address newOracle) external onlyOwner {
    emit OracleChanged(oracle, newOracle);
    oracle = newOracle;
  }
  function claimReward(ClaimRewards[] memory claims) external {
    for(uint i = 0; i<claims.length; i++) {
      require(claimProofValid(msg.sender, claims[i]) == true);
      safeTransfer.invoke(
        pools[i].baseToken(),
        msg.sender,
        (claims[i].shareAmount * epochInterest[claims[i].epochIndex]) / epochTotals[claims[i].epochIndex]
      );
    }
  }
  function claimProofValid(address user, ClaimRewards memory claim) public view returns (bool) {
    bytes32 leaf = keccak256(abi.encodePacked(user, claim.shareAmount));
    return verify(epochRoots[claim.epochIndex], leaf, claim.proof);
  }

  function transferOwnership(address newOwner) external onlyOwner {
    _transferOwnership(newOwner);
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

}

contract StickyPool is ERC20 {
  IPool public aavePool;
  address public aToken;
  address public baseToken;
  address public factory;

  constructor(
    IPool _aavePool,
    address _aToken,
    address _baseToken
  ) {
    aavePool = _aavePool;
    aToken = _aToken;
    baseToken = _baseToken;
    factory = msg.sender;
  }

  function mint(uint amountIn) external {
    _mint(msg.sender, amountIn);
    safeTransfer.invokeFrom(baseToken, msg.sender, address(this), amountIn);
    ERC20(baseToken).approve(address(aavePool), amountIn);
    aavePool.supply(baseToken, amountIn, address(this), 0);
  }

  function burn(uint amountOut) external {
    _burn(msg.sender, amountOut);
    aavePool.withdraw(baseToken, amountOut, msg.sender);
  }

  function interestAvailable() public view returns(uint) {
    return ERC20(aToken).balanceOf(address(this)) - totalSupply;
  }

  function collectInterest() external {
    require(msg.sender == factory);
    aavePool.withdraw(baseToken, interestAvailable(), factory);
  }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./IERC20.sol";
import "./Ownable.sol";
import "./safeTransfer.sol";

interface ISwapHelper {
  function swap(address recipient) external;
}

interface IStickyPool {
  // TODO integrate swap helpers so that the base token doesn't matter
  function baseToken() external view returns(address);
  function interestAvailable() external view returns(uint);
  function collectInterest() external;
}

contract StickyFactory is Ownable {
  IStickyPool[] public pools;
  ISwapHelper[] public poolSwappers;
  mapping(address => uint) public lastClaimedEpochOf;
  IERC20 public rewardToken;
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
  event RewardTokenChanged(address indexed oldRewardToken, address indexed newRewardToken);
  event SwapHelperChanged(address indexed oldHelper, address indexed newHelper);
  event NewPool(address indexed stickyPool, address indexed baseToken, address indexed swapHelper);

  constructor(IERC20 _rewardToken) {
    rewardToken = _rewardToken;
    _transferOwnership(msg.sender);
    oracle = msg.sender;
  }

  // Be sure to update all swapHelpers to match before initiating next epoch
  function setRewardToken(IERC20 newRewardToken) external onlyOwner {
    emit RewardTokenChanged(address(rewardToken), address(newRewardToken));
    rewardToken = newRewardToken;
  }

  function addPool(
    IStickyPool newPool,
    ISwapHelper swapHelper
  ) external onlyOwner {
    pools.push(newPool);
    poolSwappers.push(swapHelper);
    emit NewPool(address(newPool), newPool.baseToken(), address(swapHelper));
  }

  function setSwapHelper(uint poolIndex, ISwapHelper newSwapHelper) external onlyOwner {
    emit SwapHelperChanged(address(poolSwappers[poolIndex]), address(newSwapHelper));
    poolSwappers[poolIndex] = newSwapHelper;
  }

  function initiateEpoch(bytes32 epochRoot, uint epochTotal) external {
    require(msg.sender == oracle);
    epochRoots.push(epochRoot);
    epochTotals.push(epochTotal);

    // Swap each pool interest into rewards token
    uint rewardBefore = rewardToken.balanceOf(address(this));
    // TODO allow multiple pool subsets just in case we get too many for the block gas limit
    for(uint i = 0; i<pools.length; i++) {
      uint poolEarned = pools[i].interestAvailable();
      pools[i].collectInterest();
      safeTransfer.invoke(pools[i].baseToken(), address(poolSwappers[i]), poolEarned);
      poolSwappers[i].swap(address(this));
    }
    epochInterest.push(rewardToken.balanceOf(address(this)) - rewardBefore);
  }

  function setOracleAccount(address newOracle) external onlyOwner {
    emit OracleChanged(oracle, newOracle);
    oracle = newOracle;
  }

  function claimReward(ClaimRewards[] memory claims) external {
    for(uint i = 0; i<claims.length; i++) {
      require(claimProofValid(msg.sender, claims[i]) == true);
      require((claims[i].epochIndex + 1) > lastClaimedEpochOf[msg.sender]);
      lastClaimedEpochOf[msg.sender] = claims[i].epochIndex + 1;
      safeTransfer.invoke(
        address(rewardToken),
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

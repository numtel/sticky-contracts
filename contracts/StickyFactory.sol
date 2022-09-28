// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./IERC20.sol";
import "./Ownable.sol";
import "./safeTransfer.sol";
import "./MerkleTree.sol";

interface ISwapHelper {
  // Must match the IStickyPool's interestToken
  function inputToken() external view returns(address);
  // Must match rewardToken
  function outputToken() external view returns(address);
  function swap(address recipient) external;
}

interface IStickyPool {
  function interestToken() external view returns(address);
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
  // Oracle account initializes as contract creator
  // but offers fine-grained access control only to epoch generation methods
  address public oracle;

  struct ClaimRewards {
    uint epochIndex;
    uint shareAmount;
    bytes32[] proof;
  }

  event OracleChanged(address indexed oldOracle, address indexed newOracle);
  event RewardTokenChanged(address indexed oldRewardToken, address indexed newRewardToken);
  event SwapHelperChanged(address indexed oldHelper, address indexed newHelper);
  event NewPool(address indexed stickyPool, address indexed interestToken, address indexed swapHelper);
  event NewEpoch(uint epochIndex, uint interestEarned);

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
    emit NewPool(address(newPool), newPool.interestToken(), address(swapHelper));
  }

  function setSwapHelper(uint poolIndex, ISwapHelper newSwapHelper) external onlyOwner {
    emit SwapHelperChanged(address(poolSwappers[poolIndex]), address(newSwapHelper));
    poolSwappers[poolIndex] = newSwapHelper;
  }

  function defineEpoch(bytes32 epochRoot, uint epochTotal) external onlyOracle {
    epochRoots.push(epochRoot);
    epochTotals.push(epochTotal);
    epochInterest.push(0);
  }

  function emitNewEpoch() external onlyOracle {
    emit NewEpoch(epochRoots.length - 1, epochInterest[epochInterest.length - 1]);
  }

  // Perform interest swapping for a subset of pools,
  //  can never be too careful about the block gas limit
  // Generally, should always be collecting into the latest epoch,
  //  immediately after defining it
  function collectInterest(uint epochIndex, uint poolStart, uint poolCount) external onlyOracle {
    require(msg.sender == oracle);

    // Swap each pool interest into rewards token
    uint rewardBefore = rewardToken.balanceOf(address(this));

    if(poolCount > pools.length) {
      poolCount = pools.length;
    }

    for(uint i = poolStart; i<poolCount; i++) {
      if(pools[i].interestToken() == address(rewardToken)) {
        // Bypass swap logic if interest is earned in same token as rewards
        pools[i].collectInterest();
      } else {
        require(poolSwappers[i].inputToken() == pools[i].interestToken(), 'POOL_MISMATCH');
        require(poolSwappers[i].outputToken() == address(rewardToken), 'SWAP_MISMATCH');
        uint balanceBefore = IERC20(pools[i].interestToken()).balanceOf(address(this));
        pools[i].collectInterest();
        safeTransfer.invoke(pools[i].interestToken(), address(poolSwappers[i]), IERC20(pools[i].interestToken()).balanceOf(address(this)) - balanceBefore);
        poolSwappers[i].swap(address(this));
      }
    }
    epochInterest[epochIndex] += rewardToken.balanceOf(address(this)) - rewardBefore;
  }

  function setOracleAccount(address newOracle) external onlyOwner {
    emit OracleChanged(oracle, newOracle);
    oracle = newOracle;
  }

  // Claim from multiple epochs
  //  but can never claim from earlier epochs after claiming a later one
  //  so make sure to do claim in order!
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
    return MerkleTree.verify(epochRoots[claim.epochIndex], leaf, claim.proof);
  }

  function transferOwnership(address newOwner) external onlyOwner {
    _transferOwnership(newOwner);
  }

  modifier onlyOracle() {
    require(oracle == msg.sender, "Caller is not oracle");
    _;
  }

}

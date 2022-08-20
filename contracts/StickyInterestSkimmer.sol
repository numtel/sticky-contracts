// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./IERC20.sol";
import "./Ownable.sol";

contract StickyInterestSkimmer is Ownable {
  uint public creatorTotalSupply;
  mapping(address => uint) public creatorBalanceOf;

  uint public investorTotalSupply;
  mapping(address => uint) public investorBalanceOf;

  // The Aave token
  IERC20 public aToken;
  // The underlying asset
  IERC20 public baseToken;
  // 0-0xffffffff: 0-100% of interest goes to investors
  uint32 public investorProportion;

  constructor(
    IERC20 _aToken,
    IERC20 _baseToken,
    uint32 _investorProportion
  ) {
    aToken = _aToken;
    baseToken = _baseToken;
    investorProportion = _investorProportion;
    _transferOwnership(msg.sender);
  }

  // Invoked by investors
  function deposit(uint amountIn) external {
  }

  // Invoked by investors
  function withdraw(uint amountOut) external {
  }

  // Invoked by investors
  function investorAvailable(address account) public view {
  }

  // Invoked by investors
  function investorClaim() external {
  }

  // Owner invokes for content creators
  function mint(address account, uint amount) external onlyOwner {
  }

  // Owner invokes for content creators
  function burn(address account, uint amount) external onlyOwner {
  }

  // Invoked by creators
  function creatorClaim() external {
  }

  // Invoked by creators
  function creatorAvailable(address account) external view {
  }

  // Administrative only
  function transferOwnership(address newOwner) external onlyOwner {
    _transferOwnership(newOwner);
  }

  // Administrative only
  // XXX: Any pending (unclaimed) interest will be modified by this function
  function setInvestorProportion(uint32 newValue) external onlyOwner {
  }

}

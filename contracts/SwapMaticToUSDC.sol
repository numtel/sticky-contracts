// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./IERC20.sol";
import "./safeTransfer.sol";

interface IChainlinkFeed {
  function latestAnswer() external view returns(uint256);
  function decimals() external view returns(uint8);
}

interface IUniswapV2Pair {
  function swap(uint amount0Out, uint amount1Out, address to, bytes calldata data) external;
}

contract SwapMaticToUSDC {
  IChainlinkFeed public maticPriceFeed;
  IChainlinkFeed public usdcPriceFeed;
  IUniswapV2Pair public liquidityPool;
  address public inputToken;
  address public outputToken;

  uint public slippageNumerator = 990;
  uint public slippageDenominator = 1000;

  constructor(
    // MATIC/USD price feed: 0xab594600376ec9fd91f8e885dadf0ce036862de0
    IChainlinkFeed _maticPriceFeed,
    // USDC/USD price feed: 0xfe4a8cc5b5b2366c1b58bea3858e81843581b2f7
    IChainlinkFeed _usdcPriceFeed,
    // Quickswap WMATIC/USDC pool: 0x6e7a5fafcec6bb1e78bae2a1f0b612012bf14827
    // The StickyAavePool contract must wrap the MATIC
    IUniswapV2Pair _liquidityPool,
    // WMATIC: 0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270
    address _inputToken,
    // USDC: 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174
    address _outputToken
  ) {
    maticPriceFeed = _maticPriceFeed;
    usdcPriceFeed = _usdcPriceFeed;
    liquidityPool = _liquidityPool;
    inputToken = _inputToken;
    outputToken = _outputToken;
  }

  function swap(address recipient) external {
    // Should not have to worry about this but it's a necessary condition
    require(maticPriceFeed.decimals() == usdcPriceFeed.decimals());

    uint amountIn = IERC20(inputToken).balanceOf(address(this));
    uint minOut =
      (amountIn * maticPriceFeed.latestAnswer() * slippageNumerator)
      / (usdcPriceFeed.latestAnswer() * slippageDenominator);

    safeTransfer.invoke(inputToken, address(liquidityPool), amountIn);
    liquidityPool.swap(0, minOut, recipient, "");
  }


}

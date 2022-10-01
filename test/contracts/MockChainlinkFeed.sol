// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

contract MockChainlinkFeed {
  uint public latestAnswer = 1;
  uint public decimals = 8;

  function setAnswer(uint newValue) external {
    latestAnswer = newValue;
  }
}

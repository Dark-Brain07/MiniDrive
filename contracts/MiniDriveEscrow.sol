// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MiniDriveEscrow is Ownable {
    using SafeERC20 for IERC20;

    IERC20 public USDmToken;
    
    // Tracks how much USDm each user has deposited for storage quota
    mapping(address => uint256) public userDeposits;
    
    // Total amount of USDm currently locked in the contract
    uint256 public totalPool;

    event EscrowDeposited(address indexed depositor, uint256 amount);
    event ProfitsWithdrawn(address indexed owner, uint256 amount);

    constructor(address _USDmTokenAddress) Ownable(msg.sender) {
        USDmToken = IERC20(_USDmTokenAddress);
    }

    // Allows a user to pay USDm to unlock storage space
    function depositEscrow(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        
        // Transfer USDm from user to this contract
        USDmToken.safeTransferFrom(msg.sender, address(this), amount);
        
        userDeposits[msg.sender] += amount;
        totalPool += amount;
        
        emit EscrowDeposited(msg.sender, amount);
    }

    // Allows the contract owner (You) to withdraw the USDm profits
    function withdrawProfits(uint256 amount) external onlyOwner {
        require(amount <= totalPool, "Insufficient funds in pool");
        
        totalPool -= amount;
        
        // Transfer USDm from this contract to your wallet
        USDmToken.safeTransfer(owner(), amount);
        
        emit ProfitsWithdrawn(owner(), amount);
    }
}

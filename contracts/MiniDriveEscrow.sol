// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MiniDriveEscrow is Ownable {
    using SafeERC20 for IERC20;

    IERC20 public USDmToken;
    
    struct Node {
        bool isActive;
        uint256 totalEarned;
        uint256 lastProofTime;
    }

    mapping(address => Node) public nodes;
    
    uint256 public escrowPool;
    uint256 public rewardPerProof = 0.001 * 10**18; // 0.001 USDm per proof

    event EscrowDeposited(address indexed depositor, uint256 amount);
    event NodeRegistered(address indexed node);
    event ProofSubmitted(address indexed node, bytes32 shardHash);
    event NodePaidOut(address indexed node, uint256 amount);

    constructor(address _USDmTokenAddress) Ownable(msg.sender) {
        USDmToken = IERC20(_USDmTokenAddress);
    }

    // Allows a renter or protocol to lock USDm into the contract
    function depositEscrow(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        USDmToken.safeTransferFrom(msg.sender, address(this), amount);
        escrowPool += amount;
        emit EscrowDeposited(msg.sender, amount);
    }

    // Allows a MiniPay user to register their address as an active storage node
    function registerNode() external {
        require(!nodes[msg.sender].isActive, "Node already registered");
        nodes[msg.sender] = Node({
            isActive: true,
            totalEarned: 0,
            lastProofTime: block.timestamp
        });
        emit NodeRegistered(msg.sender);
    }

    // A function for nodes to submit cryptographic proof they are holding data
    function submitProof(bytes32 shardHash) external {
        Node storage node = nodes[msg.sender];
        require(node.isActive, "Node is not registered or active");
        // Rate limit: 1 proof per 60 seconds roughly
        require(block.timestamp >= node.lastProofTime + 60, "Proof submitted too soon");

        node.lastProofTime = block.timestamp;
        
        emit ProofSubmitted(msg.sender, shardHash);

        // Automates the transfer of USDm if escrow is sufficient
        if (escrowPool >= rewardPerProof) {
            _payoutNode(msg.sender, rewardPerProof);
        }
    }

    // Automates the transfer of USDm from the escrow pool to the node
    function _payoutNode(address nodeAddress, uint256 amount) internal {
        require(escrowPool >= amount, "Insufficient escrow pool");
        escrowPool -= amount;
        nodes[nodeAddress].totalEarned += amount;
        
        USDmToken.safeTransfer(nodeAddress, amount);
        emit NodePaidOut(nodeAddress, amount);
    }

    // Admin function to set reward rate
    function setRewardPerProof(uint256 newReward) external onlyOwner {
        rewardPerProof = newReward;
    }
}

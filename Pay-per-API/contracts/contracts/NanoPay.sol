// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract NanoPay {
    address public owner;
    mapping(address => uint256) public balances;

    event Deposit(address indexed user, uint256 amount);
    event Payment(address indexed user, address indexed provider, uint256 amount);

    constructor() {
        owner = msg.sender;
    }

    // Top up balance with ETH
    function deposit() public payable {
        balances[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value);
    }

    // Simplified pay-per-call (usually called by an authorized oracle or relay)
    function payForCall(address provider, uint256 amount) public {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        balances[msg.sender] -= amount;
        balances[provider] += amount;
        emit Payment(msg.sender, provider, amount);
    }

    function withdraw() public {
        uint256 amount = balances[msg.sender];
        require(amount > 0, "Nothing to withdraw");
        balances[msg.sender] = 0;
        payable(msg.sender).transfer(amount);
    }
}

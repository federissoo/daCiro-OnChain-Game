// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract SimpleVault is Ownable {
    using ECDSA for bytes32;
    uint256 public vaultBalance;
    address public signer;

    mapping(bytes32 => bool) public usedSessions; // per sessioni già usate (contro replay attack)

    constructor(address _signer) Ownable(msg.sender) {
        signer = _signer;
    }

    function updateSigner(address _newSigner) external onlyOwner {
        signer = _newSigner;
    }

    function donate() external payable {
        // update balance
        vaultBalance += msg.value;
    }

    function startSession() external payable {
        require(msg.value >= getCurrentFee(), "Error: Insufficient funds");
        splitFee(msg.value);
    }

    /* Backend manda al frontend:
        → firma (65 bytes) = r (32 bytes) + s (32 bytes) + v (1 byte)

        Frontend manda al contratto:
        → sessionId
        → firma

        Contratto ricalcola da solo:
        → hash = keccak256(sessionId + msg.sender)
        → ethSignedHash = keccak256(prefisso + hash)
        → recovered = ecrecover(ethSignedHash, firma)
        → recovered == signer? ✅ */

    function claimVault(
        string calldata sessionId,
        bytes calldata signature
    ) external {
        bytes32 sessionHash = keccak256(abi.encodePacked(sessionId));
        if (usedSessions[sessionHash] == true) {
            revert("Session already used");
        }
        bytes32 hash = keccak256(abi.encodePacked(sessionId, msg.sender));
        bytes32 ethSignedHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", hash)
        );
        address recovered = ethSignedHash.recover(signature); // funzione di openzeppelin per estrarre indirizzo da firma + hash
        require(recovered == signer, "Firma non valida");

        // checks
        require(vaultBalance > 0, "Error: Vault is empty");

        // effects
        uint256 tempBalance = vaultBalance;
        vaultBalance = 0;
        usedSessions[sessionHash] = true;

        // interactions
        (bool success, ) = msg.sender.call{value: tempBalance}("");
        require(success, "Withdrawal failed");
    }

    function getCurrentFee() public view returns (uint256) {
        if (vaultBalance < 0.01 ether) {
            return 0.00001 ether;
        } else if (vaultBalance < 0.05 ether) {
            return 0.00005 ether;
        } else if (vaultBalance < 0.1 ether) {
            return 0.0001 ether;
        } else if (vaultBalance < 0.5 ether) {
            return 0.001 ether;
        } else if (vaultBalance < 0.75 ether) {
            return 0.0025 ether;
        } else if (vaultBalance < 1 ether) {
            return 0.005 ether;
        } else {
            return 0.01 ether;
        }
    }

    function splitFee(uint256 _fee) internal {
        uint256 devFee = (_fee * 30) / 100;
        uint256 vaultFee = (_fee * 70) / 100;

        (bool success, ) = owner().call{value: devFee}("");
        require(success, "Dev fee transfer failed");

        vaultBalance += vaultFee;
    }
}

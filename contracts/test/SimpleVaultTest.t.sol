// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "../src/SimpleVault.sol";

contract SimpleVaultTest is Test {
    SimpleVault public vault;

    uint256 signerPrivateKey;
    address signerAddress;
    address user;
    string sessionId;
    bytes signature;

    function setUp() public {
        signerPrivateKey = 0xA11CE;
        signerAddress = vm.addr(signerPrivateKey);
        user = makeAddr("user");
        sessionId = "session1";

        vault = new SimpleVault(signerAddress);

        // calcolo l'hash e la firma
        bytes32 hash = keccak256(abi.encodePacked(sessionId, user));
        bytes32 ethSignedHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", hash)
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(
            signerPrivateKey,
            ethSignedHash
        );
        signature = abi.encodePacked(r, s, v);
    }

    function test_startSession() public {
        // paga la fee corretta, verifica che vaultBalance aumenti
        vault.startSession{value: 0.00001 ether}();
        assertEq(vault.vaultBalance(), (0.00001 ether * 70) / 100);
        assertEq(vault.getCurrentFee(), 0.00001 ether);
        assertEq(vault.owner(), address(this));
    }

    function test_claimVault() public {
        vault.startSession{value: 0.00001 ether}();
        vm.prank(user);
        vault.claimVault(sessionId, signature);
        assertEq(vault.vaultBalance(), 0);
    }

    function test_replayAttack() public {
        // chiama claimVault due volte con la stessa firma, verifica che la seconda fallisca
        vault.startSession{value: 0.00001 ether}();
        vm.prank(user);
        vault.claimVault(sessionId, signature);
        vm.prank(user);
        vm.expectRevert();
        vault.claimVault(sessionId, signature);
    }

    receive() external payable {}
}

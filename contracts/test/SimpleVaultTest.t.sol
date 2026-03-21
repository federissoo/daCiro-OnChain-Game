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
    function test_dynamicFees() public {
        assertEq(vault.getCurrentFee(), 0.00001 ether);
        
        vm.deal(user, 10 ether);
        vm.prank(user);
        vault.donate{value: 0.01 ether}();
        assertEq(vault.getCurrentFee(), 0.00005 ether);

        vm.prank(user);
        vault.donate{value: 0.04 ether}(); // 0.05 total
        assertEq(vault.getCurrentFee(), 0.0001 ether);

        vm.prank(user);
        vault.donate{value: 0.05 ether}(); // 0.1 total
        assertEq(vault.getCurrentFee(), 0.001 ether);

        vm.prank(user);
        vault.donate{value: 0.4 ether}(); // 0.5 total
        assertEq(vault.getCurrentFee(), 0.0025 ether);

        vm.prank(user);
        vault.donate{value: 0.25 ether}(); // 0.75 total
        assertEq(vault.getCurrentFee(), 0.005 ether);

        vm.prank(user);
        vault.donate{value: 0.25 ether}(); // 1.0 total
        assertEq(vault.getCurrentFee(), 0.01 ether);
    }

    receive() external payable {}
}

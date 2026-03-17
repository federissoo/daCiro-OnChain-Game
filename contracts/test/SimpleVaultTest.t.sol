/* 
    test_startSession — paga la fee corretta, verifica che vaultBalance aumenti
    test_claimVault — simula una firma valida del signer e verifica che il vault venga pagato
    test_replayAttack — chiama claimVault due volte con la stessa firma, verifica che la seconda fallisca 
*/
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "../src/SimpleVault.sol";

contract SimpleVaultTest is Test {
    SimpleVault public vault;
    address public owner = makeAddr("owner");
    address public signer = makeAddr("signer");
    address public user = makeAddr("user");

    function setUp() public {
        vault = new SimpleVault(signer);
    }

    function test_startSession() public {
        // paga la fee corretta, verifica che vaultBalance aumenti
    }

    function test_claimVault() public {
        // simula una firma valida del signer e verifica che il vault venga pagato
    }

    function test_replayAttack() public {
        // chiama claimVault due volte con la stessa firma, verifica che la seconda fallisca
    }
}

pragma solidity ^0.8.0;

import "forge-std/Script.sol";
import "../src/SimpleVault.sol";

contract DeploySimpleVault is Script {
    function run() external {
        // tutto quello che sta tra startBroadcast e stopBroadcast
        // viene eseguito come transazione reale sulla blockchain
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerKey);

        // deploya il contratto
        address signer = vm.envAddress("SIGNER_ADDRESS");
        SimpleVault vault = new SimpleVault(signer);

        vm.stopBroadcast();
    }
}

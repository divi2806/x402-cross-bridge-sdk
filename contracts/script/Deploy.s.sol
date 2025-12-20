// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../PaymentSettlement.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("SETTLER_PRIVATE_KEY");
        address settler = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        PaymentSettlement settlement = new PaymentSettlement(settler);

        console.log("PaymentSettlement deployed at:", address(settlement));
        console.log("Settler address:", settler);

        vm.stopBroadcast();
    }
}


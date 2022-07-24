const hre = require("hardhat");

async function main() {
  const mainContract = await hre.ethers.getContractFactory("MainContract");
  const mainContractInstance = await mainContract.deploy();

  await mainContractInstance.deployed()

  console.log("MainContract deployed to:", mainContractInstance.address);
  console.log("RewardToken deployed to:", await mainContractInstance.token());
  console.log("VoteNFT deployed to:", await mainContractInstance.nft());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

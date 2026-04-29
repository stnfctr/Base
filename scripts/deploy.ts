import { ethers } from "hardhat";

async function main() {
  console.log("Deploying NanoPay to Base Sepolia...");

  const NanoPay = await ethers.getContractFactory("NanoPay");
  const contract = await NanoPay.deploy();

  await contract.waitForDeployment();

  console.log(`NanoPay deployed to: ${await contract.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

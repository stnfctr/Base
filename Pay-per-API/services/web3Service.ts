import { ethers } from 'ethers';

// Base Sepolia Chain Identity
export const BASE_SEPOLIA_CHAIN_ID = '0x14a34'; // 84532

export async function connectWallet() {
  const metaMask = (window as any).ethereum;
  if (!metaMask) {
    console.error("MetaMask not found");
    return null;
  }
  
  try {
    const accounts = await metaMask.request({ method: 'eth_requestAccounts' });
    if (!accounts || accounts.length === 0) return null;

    const provider = new ethers.BrowserProvider(metaMask);
    const signer = await provider.getSigner();

    // Ensure network is Base Sepolia
    const network = await provider.getNetwork();
    if (network.chainId !== 84532n) {
      try {
        await metaMask.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: BASE_SEPOLIA_CHAIN_ID }],
        });
      } catch (switchError: any) {
        // This error code indicates that the chain has not been added to MetaMask.
        if (switchError.code === 4902) {
          await metaMask.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: BASE_SEPOLIA_CHAIN_ID,
                chainName: 'Base Sepolia',
                rpcUrls: ['https://sepolia.base.org'],
                nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
                blockExplorerUrls: ['https://sepolia.basescan.org'],
              },
            ],
          });
        } else {
          throw switchError;
        }
      }
    }

    return { provider, signer, address: await signer.getAddress() };
  } catch (error: any) {
    console.error("Wallet connection error:", error);
    return null;
  }
}

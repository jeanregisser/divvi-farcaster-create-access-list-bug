import { sdk } from "@farcaster/miniapp-sdk";
import { useEffect, useState } from "react";
import {
  useAccount,
  useConnect,
  useSwitchChain,
  useChainId,
  useBalance,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { base, celo } from "wagmi/chains";
import { erc20Abi, parseUnits, formatUnits, Address } from "viem";

// USDC contract addresses from the documentation
const USDC_ADDRESSES: Record<number, Address> = {
  [base.id]: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
  [celo.id]: "0xceba9300f2b948710d2653dd7b07f33a8b32118c",
};

const SUPPORTED_CHAINS = [base, celo];
const TOKEN_SEND_AMOUNT = "0.01"; // 0.01 USDC

function App() {
  useEffect(() => {
    sdk.actions.ready();
  }, []);

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1>🔍 Farcaster Wallet Access List Debug Tool</h1>
      <p>Test eth_createAccessList behavior on Base vs Celo</p>
      <ConnectMenu />
    </div>
  );
}

function ConnectMenu() {
  const { isConnected, address } = useAccount();
  const { connect, connectors } = useConnect();

  if (isConnected) {
    return (
      <div>
        <div
          style={{
            marginBottom: "20px",
            padding: "10px",
            backgroundColor: "#e8f5e8",
            borderRadius: "5px",
          }}
        >
          <strong>✅ Connected:</strong> {address}
        </div>
        <NetworkDebugger />
      </div>
    );
  }

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <button
        type="button"
        onClick={() => connect({ connector: connectors[0] })}
        style={{
          padding: "12px 24px",
          fontSize: "16px",
          backgroundColor: "#007bff",
          color: "white",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
        }}
      >
        Connect Farcaster Wallet
      </button>
    </div>
  );
}

function NetworkDebugger() {
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { address } = useAccount();
  const [lastTransactionResult, setLastTransactionResult] = useState<any>(null);

  const currentChain = SUPPORTED_CHAINS.find((chain) => chain.id === chainId);
  const usdcAddress = USDC_ADDRESSES[chainId];

  return (
    <div>
      <NetworkSwitcher
        currentChain={currentChain}
        onSwitchChain={switchChain}
      />

      {currentChain && usdcAddress && address && (
        <>
          <AccountInfo
            address={address}
            chainId={chainId}
            usdcAddress={usdcAddress}
          />
          <TransactionTester
            address={address}
            chainId={chainId}
            usdcAddress={usdcAddress}
            onResult={setLastTransactionResult}
          />
          {lastTransactionResult && (
            <ResultDisplay result={lastTransactionResult} />
          )}
        </>
      )}
    </div>
  );
}

function NetworkSwitcher({
  currentChain,
  onSwitchChain,
}: {
  currentChain: any;
  onSwitchChain: any;
}) {
  return (
    <div style={{ marginBottom: "20px" }}>
      <h3>🌐 Network Selection</h3>
      <div style={{ display: "flex", gap: "10px" }}>
        {SUPPORTED_CHAINS.map((chain) => (
          <button
            key={chain.id}
            onClick={() => onSwitchChain({ chainId: chain.id })}
            style={{
              padding: "8px 16px",
              backgroundColor:
                currentChain?.id === chain.id ? "#28a745" : "#6c757d",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
            }}
          >
            {chain.name} {currentChain?.id === chain.id && "✓"}
          </button>
        ))}
      </div>
      {currentChain && (
        <p style={{ marginTop: "10px", fontSize: "14px", color: "#666" }}>
          Current: {currentChain.name} (Chain ID: {currentChain.id})
        </p>
      )}
    </div>
  );
}

function AccountInfo({
  address,
  chainId,
  usdcAddress,
}: {
  address: Address;
  chainId: number;
  usdcAddress: Address;
}) {
  const { data: nativeBalance } = useBalance({ address });
  const { data: usdcSymbol } = useReadContract({
    address: usdcAddress,
    abi: erc20Abi,
    functionName: "symbol",
  });
  const { data: usdcDecimals } = useReadContract({
    address: usdcAddress,
    abi: erc20Abi,
    functionName: "decimals",
  });
  const { data: usdcBalance } = useReadContract({
    address: usdcAddress,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [address],
  });

  const currentChain = SUPPORTED_CHAINS.find((chain) => chain.id === chainId);

  return (
    <div
      style={{
        marginBottom: "20px",
        padding: "15px",
        backgroundColor: "#f8f9fa",
        borderRadius: "5px",
      }}
    >
      <h3>💰 Account Balances</h3>
      <div style={{ fontSize: "14px" }}>
        <div>
          <strong>Native Token:</strong> {nativeBalance?.formatted}{" "}
          {currentChain?.nativeCurrency.symbol}
        </div>
        <div>
          <strong>USDC:</strong>{" "}
          {usdcBalance && usdcDecimals
            ? formatUnits(usdcBalance, usdcDecimals)
            : "Loading..."}{" "}
          {usdcSymbol}
        </div>
        <div style={{ marginTop: "10px", fontSize: "12px", color: "#666" }}>
          <strong>USDC Contract:</strong> {usdcAddress}
        </div>
      </div>
    </div>
  );
}

function TransactionTester({
  address,
  chainId,
  usdcAddress,
  onResult,
}: {
  address: Address;
  chainId: number;
  usdcAddress: Address;
  onResult: (result: any) => void;
}) {
  const { data: usdcDecimals } = useReadContract({
    address: usdcAddress,
    abi: erc20Abi,
    functionName: "decimals",
  });

  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    data: receipt,
  } = useWaitForTransactionReceipt({
    hash,
  });

  const currentChain = SUPPORTED_CHAINS.find((chain) => chain.id === chainId);

  useEffect(() => {
    if (error) {
      onResult({
        type: "error",
        chainName: currentChain?.name,
        chainId,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }, [error, currentChain?.name, chainId, onResult]);

  useEffect(() => {
    if (isConfirmed && receipt) {
      onResult({
        type: "success",
        chainName: currentChain?.name,
        chainId,
        hash,
        receipt,
        timestamp: new Date().toISOString(),
      });
    }
  }, [isConfirmed, receipt, currentChain?.name, chainId, hash, onResult]);

  const handleSendTransaction = async () => {
    if (!usdcDecimals) return;

    try {
      await writeContract({
        address: usdcAddress,
        abi: erc20Abi,
        functionName: "transfer",
        args: [address, parseUnits(TOKEN_SEND_AMOUNT, usdcDecimals)],
      });
    } catch (err) {
      onResult({
        type: "error",
        chainName: currentChain?.name,
        chainId,
        error: err instanceof Error ? err.message : String(err),
        timestamp: new Date().toISOString(),
      });
    }
  };

  return (
    <div
      style={{
        marginBottom: "20px",
        padding: "15px",
        backgroundColor: "#fff3cd",
        borderRadius: "5px",
      }}
    >
      <h3>🧪 Transaction Test</h3>
      <p style={{ fontSize: "14px", marginBottom: "15px" }}>
        This will send {TOKEN_SEND_AMOUNT} USDC to yourself. The Farcaster
        wallet will attempt to create an access list behind the scenes.
      </p>

      <button
        onClick={handleSendTransaction}
        disabled={isPending || isConfirming || !usdcDecimals}
        style={{
          padding: "10px 20px",
          fontSize: "16px",
          backgroundColor: isPending || isConfirming ? "#6c757d" : "#dc3545",
          color: "white",
          border: "none",
          borderRadius: "5px",
          cursor: isPending || isConfirming ? "not-allowed" : "pointer",
        }}
      >
        {isPending && "Preparing Transaction..."}
        {isConfirming && "Confirming Transaction..."}
        {!isPending &&
          !isConfirming &&
          `Test ${TOKEN_SEND_AMOUNT} USDC Transfer on ${currentChain?.name}`}
      </button>

      {hash && (
        <div style={{ marginTop: "10px", fontSize: "12px", color: "#666" }}>
          Transaction Hash: {hash}
        </div>
      )}
    </div>
  );
}

function ResultDisplay({ result }: { result: any }) {
  const isError = result.type === "error";

  return (
    <div
      style={{
        padding: "15px",
        backgroundColor: isError ? "#f8d7da" : "#d4edda",
        borderRadius: "5px",
        border: `1px solid ${isError ? "#f5c6cb" : "#c3e6cb"}`,
      }}
    >
      <h3>
        {isError ? "❌" : "✅"} Latest Result - {result.chainName}
      </h3>
      <div style={{ fontSize: "14px" }}>
        <div>
          <strong>Time:</strong> {new Date(result.timestamp).toLocaleString()}
        </div>
        <div>
          <strong>Chain:</strong> {result.chainName} (ID: {result.chainId})
        </div>

        {isError && (
          <div style={{ marginTop: "10px" }}>
            <strong>Error:</strong>
            <pre
              style={{
                backgroundColor: "#fff",
                padding: "10px",
                borderRadius: "3px",
                fontSize: "12px",
                overflow: "auto",
                marginTop: "5px",
              }}
            >
              {result.error}
            </pre>
          </div>
        )}

        {!isError && result.hash && (
          <div style={{ marginTop: "10px" }}>
            <div>
              <strong>Transaction Hash:</strong> {result.hash}
            </div>
            <div>
              <strong>Status:</strong> Transaction successful! ✅
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

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
  useEstimateGas,
} from "wagmi";
import { base, celo } from "wagmi/chains";
import {
  erc20Abi,
  parseUnits,
  formatUnits,
  Address,
  encodeFunctionData,
} from "viem";

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
  const { data: nativeBalance, status: nativeBalanceStatus } = useBalance({
    address,
  });

  const { data: usdcSymbol, status: symbolStatus } = useReadContract({
    address: usdcAddress,
    abi: erc20Abi,
    functionName: "symbol",
  });

  const { data: usdcDecimals, status: decimalsStatus } = useReadContract({
    address: usdcAddress,
    abi: erc20Abi,
    functionName: "decimals",
  });

  const { data: usdcBalance, status: balanceStatus } = useReadContract({
    address: usdcAddress,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [address],
  });

  const currentChain = SUPPORTED_CHAINS.find((chain) => chain.id === chainId);

  const formatNativeBalance = () => {
    if (nativeBalanceStatus === "pending") return "Loading...";
    if (nativeBalanceStatus === "error") return "Error loading balance";
    return nativeBalance.formatted;
  };

  const formatUsdcBalance = () => {
    if (balanceStatus === "pending") return "Loading...";
    if (balanceStatus === "error") return "Error loading balance";
    if (decimalsStatus === "error" || usdcDecimals === undefined)
      return "Error loading decimals";
    return formatUnits(usdcBalance, usdcDecimals);
  };

  const getUsdcSymbol = () => {
    if (symbolStatus === "pending") return "...";
    if (symbolStatus === "error") return "USDC";
    return usdcSymbol || "USDC";
  };

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
          <strong>Native Token:</strong> {formatNativeBalance()}{" "}
          {currentChain?.nativeCurrency.symbol}
        </div>
        <div>
          <strong>USDC:</strong> {formatUsdcBalance()} {getUsdcSymbol()}
        </div>
        <div style={{ marginTop: "10px", fontSize: "12px", color: "#666" }}>
          <strong>USDC Contract:</strong> {usdcAddress}
        </div>
        {(nativeBalanceStatus === "error" ||
          symbolStatus === "error" ||
          decimalsStatus === "error" ||
          balanceStatus === "error") && (
          <div
            style={{ marginTop: "10px", fontSize: "12px", color: "#dc3545" }}
          >
            ⚠️ Some contract data failed to load (this may indicate RPC issues)
          </div>
        )}
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
  const [usePreEstimatedGas, setUsePreEstimatedGas] = useState(false);

  const { data: usdcDecimals } = useReadContract({
    address: usdcAddress,
    abi: erc20Abi,
    functionName: "decimals",
  });

  // Prepare transaction data for gas estimation
  const transferData = usdcDecimals
    ? encodeFunctionData({
        abi: erc20Abi,
        functionName: "transfer",
        args: [address, parseUnits(TOKEN_SEND_AMOUNT, usdcDecimals)],
      })
    : undefined;

  // Estimate gas (only when toggle is enabled and we have the data)
  const { data: estimatedGas, status: gasEstimationStatus } = useEstimateGas({
    to: usdcAddress,
    data: transferData,
    account: address,
    query: {
      enabled: usePreEstimatedGas && !!transferData,
    },
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
      const txParams: any = {
        address: usdcAddress,
        abi: erc20Abi,
        functionName: "transfer",
        args: [address, parseUnits(TOKEN_SEND_AMOUNT, usdcDecimals)],
      };

      // Include pre-estimated gas if the toggle is enabled and we have the gas estimate
      if (usePreEstimatedGas && estimatedGas) {
        txParams.gas = estimatedGas;
      }

      await writeContract(txParams);
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

      {/* Gas Estimation Toggle */}
      <div
        style={{
          marginBottom: "15px",
          padding: "10px",
          backgroundColor: "#f8f9fa",
          borderRadius: "5px",
        }}
      >
        <div
          style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}
        >
          <input
            type="checkbox"
            id="usePreEstimatedGas"
            checked={usePreEstimatedGas}
            onChange={(e) => setUsePreEstimatedGas(e.target.checked)}
            style={{ marginRight: "8px" }}
          />
          <label
            htmlFor="usePreEstimatedGas"
            style={{ fontSize: "14px", fontWeight: "bold" }}
          >
            Pre-estimate gas
          </label>
        </div>

        {usePreEstimatedGas && (
          <div style={{ fontSize: "12px", color: "#666" }}>
            {gasEstimationStatus === "pending" && "⏳ Estimating gas..."}
            {gasEstimationStatus === "success" &&
              estimatedGas !== undefined &&
              estimatedGas > 0n &&
              `✅ Estimated gas: ${estimatedGas.toString()}`}
            {gasEstimationStatus === "error" &&
              "❌ Gas estimation failed (this indicates RPC issues)"}
            {gasEstimationStatus !== "pending" &&
              gasEstimationStatus !== "success" &&
              gasEstimationStatus !== "error" &&
              "💤 Ready to estimate gas"}
          </div>
        )}

        <div style={{ fontSize: "11px", color: "#666", marginTop: "5px" }}>
          💡 This fetches gas beforehand to see if it fixes the issue with
          eth_createAccessList
        </div>
      </div>

      <button
        onClick={handleSendTransaction}
        disabled={
          isPending ||
          isConfirming ||
          !usdcDecimals ||
          (usePreEstimatedGas && gasEstimationStatus === "pending")
        }
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
        {usePreEstimatedGas &&
          gasEstimationStatus === "pending" &&
          "Estimating Gas..."}
        {!isPending &&
          !isConfirming &&
          !(usePreEstimatedGas && gasEstimationStatus === "pending") &&
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

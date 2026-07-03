"use client";

import { useState, useEffect, useRef } from "react";
import { createWalletClient, custom, parseAbi, publicActions, formatEther, parseEther } from "viem";
import { celoAlfajores } from "viem/chains";

// ABI Definitions
const ESCROW_ABI = parseAbi([
  "function depositEscrow(uint256 amount) external",
  "function registerNode() external",
  "function submitProof(bytes32 shardHash) external",
  "function nodes(address) view returns (bool isActive, uint256 totalEarned, uint256 lastProofTime)",
  "function escrowPool() view returns (uint256)",
  "function rewardPerProof() view returns (uint256)",
]);

const USDm_ABI = parseAbi([
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
]);

const CONTRACT_ADDRESS = "0x8D06dC63D133887cDe5C7BBe59B8B309bB4f9eAe";
const USDm_ADDRESS = "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1";

type Tab = "VAULT" | "UPGRADE" | "NODE";
type Folder = { id: string; name: string; parentId: string | null };
type Shard = { id: string; name: string; size: string; hash: string; folderId: string | null };

export default function Home() {
  // Theme State
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Wallet State
  const [address, setAddress] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // App State
  const [activeTab, setActiveTab] = useState<Tab>("VAULT");
  
  // Node State
  const [isNodeActive, setIsNodeActive] = useState(false);
  const [totalEarned, setTotalEarned] = useState("0");
  const [allocatedStorage, setAllocatedStorage] = useState(50);
  const [showEarningDetails, setShowEarningDetails] = useState(false);
  
  // Upgrade / Escrow State
  const [depositAmount, setDepositAmount] = useState("");
  const [userEscrow, setUserEscrow] = useState(0); // Locally tracked for UI simulation
  
  // File Explorer State
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [folders, setFolders] = useState<Folder[]>([
    { id: "f1", name: "Documents", parentId: null },
    { id: "f2", name: "Photos", parentId: null }
  ]);
  const [shards, setShards] = useState<Shard[]>([
    { id: "s1", name: "backup_01.zip", size: "12 MB", hash: "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco", folderId: null },
    { id: "s2", name: "tax_2023.pdf", size: "2.4 MB", hash: "QmTax2023...", folderId: "f1" }
  ]);
  
  // Selection State
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // Info Modal & Long Press State
  const [infoItem, setInfoItem] = useState<Shard | Folder | null>(null);
  const [contextMenuTarget, setContextMenuTarget] = useState<Shard | Folder | null>(null);
  const pressTimer = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);

  // Download State
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadingFileName, setDownloadingFileName] = useState<string>("");
  const [retrieveHash, setRetrieveHash] = useState("");
  const downloadIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Upload State
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadingFileName, setUploadingFileName] = useState<string>("");
  const [uploadStatus, setUploadStatus] = useState("");
  const uploadIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const usedStorage = shards.reduce((acc, s) => {
    const val = parseFloat(s.size);
    if (!isNaN(val)) {
      if (s.size.includes("GB")) return acc + val * 1024;
      if (s.size.includes("MB")) return acc + val;
      if (s.size.includes("KB")) return acc + val / 1024;
    }
    return acc;
  }, 0);
  
  // 50 MB Free Tier + 5GB (5000 MB) per 1 USDm deposited
  const maxStorage = 50 + (userEscrow * 5000); 

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const getClient = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof window !== "undefined" && (window as any).ethereum) {
      return createWalletClient({
        chain: celoAlfajores,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        transport: custom((window as any).ethereum),
      }).extend(publicActions);
    }
    return null;
  };

  const connectWallet = async () => {
    const client = getClient();
    if (!client) {
      setStatusMessage("No wallet detected. Open in MiniPay.");
      return;
    }
    try {
      setLoading(true);
      const [account] = await client.requestAddresses();
      setAddress(account);
      setStatusMessage("Wallet connected!");
      await refreshData(account, client);
    } catch (err: unknown) {
      setStatusMessage(`Connection failed: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async (userAddress: string, client: ReturnType<typeof getClient>) => {
    if (!client) return;
    try {
      const nodeData = await client.readContract({
        address: CONTRACT_ADDRESS,
        abi: ESCROW_ABI,
        functionName: "nodes",
        args: [userAddress as `0x${string}`],
      }) as [boolean, bigint, bigint];
      
      setIsNodeActive(nodeData[0]);
      setTotalEarned(formatEther(nodeData[1]));
    } catch (err) {
      console.error(err);
    }
  };

  const registerNode = async () => {
    const client = getClient();
    if (!client || !address) return;
    try {
      setLoading(true);
      setStatusMessage("Registering node...");
      const { request } = await client.simulateContract({
        account: address as `0x${string}`,
        address: CONTRACT_ADDRESS,
        abi: ESCROW_ABI,
        functionName: "registerNode",
      });
      const hash = await client.writeContract(request);
      setStatusMessage(`Transaction sent...`);
      await client.waitForTransactionReceipt({ hash });
      setStatusMessage("Node registered successfully!");
      await refreshData(address, client);
    } catch (err: unknown) {
      const error = err as { shortMessage?: string; message?: string };
      setStatusMessage(`Error: ${error.shortMessage || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const depositToEscrow = async () => {
    const client = getClient();
    if (!client || !address || !depositAmount) return;
    try {
      setLoading(true);
      const amountWei = parseEther(depositAmount);
      setStatusMessage("Approving USDm...");
      
      const { request: approveReq } = await client.simulateContract({
        account: address as `0x${string}`,
        address: USDm_ADDRESS,
        abi: USDm_ABI,
        functionName: "approve",
        args: [CONTRACT_ADDRESS, amountWei],
      });
      const approveHash = await client.writeContract(approveReq);
      await client.waitForTransactionReceipt({ hash: approveHash });

      setStatusMessage("Depositing to Escrow...");
      const { request: depositReq } = await client.simulateContract({
        account: address as `0x${string}`,
        address: CONTRACT_ADDRESS,
        abi: ESCROW_ABI,
        functionName: "depositEscrow",
        args: [amountWei],
      });
      const depositHash = await client.writeContract(depositReq);
      await client.waitForTransactionReceipt({ hash: depositHash });
      
      setStatusMessage("Deposit successful!");
      setUserEscrow(prev => prev + parseFloat(depositAmount));
      setDepositAmount("");
      await refreshData(address, client);
    } catch (err: unknown) {
      const error = err as { shortMessage?: string; message?: string };
      setStatusMessage(`Error: ${error.shortMessage || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // --- VAULT FUNCTIONS ---

  const createFolder = () => {
    const name = prompt("Enter new folder name:");
    if (name && name.trim() !== "") {
      setFolders([...folders, { id: "f" + Date.now(), name, parentId: currentFolder }]);
    }
  };

  const simulateUpload = async () => {
    if (!address) return;

    const fileName = prompt("Enter file name to upload (simulation):", `file_${Math.floor(Math.random()*100)}.dat`);
    if (!fileName) return;

    setUploadingFileName(fileName);
    setUploadProgress(0);
    setUploadError(null);
    setUploadStatus("Encrypting...");

    // Check if user storage is full
    if (usedStorage >= maxStorage) {
      uploadIntervalRef.current = setInterval(() => {
        setUploadProgress(10);
        setUploadError("Vault Storage Full.");
        if (uploadIntervalRef.current) clearInterval(uploadIntervalRef.current);
      }, 500);
      return;
    }
    
    // Simulate a 10% chance of failure for demonstration
    const willFail = Math.random() < 0.10;
    const failAt = Math.floor(Math.random() * 40) + 40; // Fail between 40-80%

    let progress = 0;
    uploadIntervalRef.current = setInterval(() => {
      progress += Math.floor(Math.random() * 12) + 4;
      
      if (willFail && progress >= failAt) {
        if (uploadIntervalRef.current) clearInterval(uploadIntervalRef.current);
        // Pick a random error message
        const errorMsg = Math.random() > 0.5 ? "Network connection lost." : "Failed to distribute shards.";
        setUploadError(errorMsg);
        setUploadProgress(progress);
        return;
      }

      if (progress > 30 && progress < 70) setUploadStatus("Sharding...");
      if (progress >= 70) setUploadStatus("Distributing to Network...");

      if (progress >= 100) {
        progress = 100;
        if (uploadIntervalRef.current) clearInterval(uploadIntervalRef.current);
        
        // Finalize Upload
        const newHash = "Qm" + Array.from({length: 44}, () => Math.floor(Math.random()*16).toString(16)).join("");
        setShards(prev => [{ id: "s" + Date.now(), name: fileName, size: "4 MB", hash: newHash, folderId: currentFolder }, ...prev]);
        
        setTimeout(() => {
          setUploadProgress(null);
          setUploadStatus("");
          setStatusMessage(`Uploaded ${fileName} to Vault!`);
        }, 1200);
      }
      setUploadProgress(progress);
    }, 250);
  };

  const cancelUpload = () => {
    if (uploadIntervalRef.current) clearInterval(uploadIntervalRef.current);
    setUploadProgress(null);
    setUploadError(null);
    setUploadStatus("");
    setStatusMessage("Upload canceled.");
  };

  const toggleSelection = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newSelection = new Set(selectedItems);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedItems(newSelection);
  };

  const downloadSelected = () => {
    if (selectedItems.size === 0) return;
    const name = selectedItems.size === 1 ? "1 item" : `${selectedItems.size} items`;
    startDownload(name);
    setSelectedItems(new Set());
  };

  const deleteSelected = () => {
    if (selectedItems.size === 0) return;
    if (window.confirm(`Are you sure you want to permanently delete ${selectedItems.size} items?`)) {
      setFolders(folders.filter(f => !selectedItems.has(f.id)));
      setShards(shards.filter(s => !selectedItems.has(s.id)));
      setSelectedItems(new Set());
      setStatusMessage("Items successfully deleted from network.");
    }
  };

  const startDownload = (fileName: string) => {
    setDownloadingFileName(fileName);
    setDownloadProgress(0);
    setDownloadError(null);
    
    // Simulate a 10% chance of failure for demonstration
    const willFail = Math.random() < 0.10;
    const failAt = Math.floor(Math.random() * 40) + 40;

    let progress = 0;
    downloadIntervalRef.current = setInterval(() => {
      progress += Math.floor(Math.random() * 15) + 5;
      
      if (willFail && progress >= failAt) {
        if (downloadIntervalRef.current) clearInterval(downloadIntervalRef.current);
        setDownloadError("Failed to retrieve shards from network.");
        setDownloadProgress(progress);
        return;
      }

      if (progress >= 100) {
        progress = 100;
        if (downloadIntervalRef.current) clearInterval(downloadIntervalRef.current);
        setTimeout(() => {
          setDownloadProgress(null);
          setStatusMessage(`Successfully downloaded ${fileName}!`);
        }, 1200);
      }
      setDownloadProgress(progress);
    }, 300);
  };

  const cancelDownload = () => {
    if (downloadIntervalRef.current) clearInterval(downloadIntervalRef.current);
    setDownloadProgress(null);
    setDownloadError(null);
    setStatusMessage("Download canceled.");
  };

  const simulateDownload = async () => {
    if (!retrieveHash) return;
    setLoading(true);
    setStatusMessage("Locating shards...");
    await new Promise(r => setTimeout(r, 1500));
    setStatusMessage("Decrypting data...");
    await new Promise(r => setTimeout(r, 1500));
    setStatusMessage("Download complete!");
    setRetrieveHash("");
    setLoading(false);
  };

  // --- LONG PRESS LOGIC ---
  const handlePressStart = (item: Shard | Folder) => {
    isLongPress.current = false;
    pressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      setContextMenuTarget(item);
    }, 500);
  };

  const handlePressEnd = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  const getFolderSizeMB = (folderId: string): number => {
    let sizeMB = 0;
    shards.filter(s => s.folderId === folderId).forEach(s => {
      const val = parseFloat(s.size);
      if (!isNaN(val)) {
        if (s.size.includes("GB")) sizeMB += val * 1024;
        else if (s.size.includes("MB")) sizeMB += val;
        else if (s.size.includes("KB")) sizeMB += val / 1024;
      }
    });
    folders.filter(f => f.parentId === folderId).forEach(subf => {
      sizeMB += getFolderSizeMB(subf.id);
    });
    return sizeMB;
  };

  return (
    <div className="min-h-screen flex justify-center font-sans transition-colors duration-300 select-none">
      
      {/* Context Menu Popup (Long Press) */}
      {contextMenuTarget && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 px-4" 
          onClick={() => setContextMenuTarget(null)}
        >
          <div className="bg-[var(--card-bg)] border-[3px] border-[var(--border-color)] rounded-[24px] p-2 flex flex-col shadow-[8px_8px_0px_0px_var(--shadow-color)] min-w-[220px] animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="px-4 py-3 border-b-2 border-dashed border-[var(--border-color)] flex gap-3 items-center mb-1">
              <span className="text-2xl drop-shadow-sm">
                {'hash' in contextMenuTarget ? '📄' : '📁'}
              </span>
              <span className="font-extrabold text-sm line-clamp-1">{contextMenuTarget.name}</span>
            </div>
            
            <button 
              onClick={() => { setInfoItem(contextMenuTarget); setContextMenuTarget(null); }} 
              className="px-4 py-4 text-left font-extrabold text-[var(--text-primary)] hover:bg-[var(--bg-color)] rounded-[16px] transition-colors flex items-center gap-3"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              View Details
            </button>
            <button 
              onClick={() => setContextMenuTarget(null)} 
              className="px-4 py-4 text-left font-extrabold text-[var(--text-muted)] hover:bg-[var(--bg-color)] rounded-[16px] transition-colors flex items-center gap-3"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Multi-Select Floating Action Bar */}
      {selectedItems.size > 0 && activeTab === "VAULT" && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 bg-[var(--accent-secondary)] border-[3px] border-[var(--border-color)] px-4 py-3 rounded-full flex items-center justify-between gap-3 shadow-[4px_4px_0px_0px_var(--shadow-color)] animate-in slide-in-from-bottom-5 w-[90%] max-w-sm">
          <span className="font-extrabold text-[var(--btn-text)] pl-2">{selectedItems.size} Selected</span>
          <div className="flex gap-2">
            <button 
              onClick={deleteSelected} 
              className="bg-[#ff6b6b] text-black border-2 border-[var(--border-color)] w-10 h-10 flex items-center justify-center rounded-full font-bold shadow-[2px_2px_0px_0px_var(--shadow-color)] active:translate-y-px active:translate-x-px active:shadow-none transition-all hover:bg-red-400"
              title="Delete Selected"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
            <button 
              onClick={downloadSelected} 
              className="bg-[var(--accent-primary)] text-[var(--btn-text)] border-2 border-[var(--border-color)] px-4 py-2 rounded-full font-bold shadow-[2px_2px_0px_0px_var(--shadow-color)] active:translate-y-px active:translate-x-px active:shadow-none transition-all"
            >
              Download
            </button>
            <button 
              onClick={() => setSelectedItems(new Set())} 
              className="bg-[var(--card-bg)] text-[var(--text-primary)] border-2 border-[var(--border-color)] w-10 h-10 flex items-center justify-center rounded-full font-bold shadow-[2px_2px_0px_0px_var(--shadow-color)] active:translate-y-px active:translate-x-px active:shadow-none transition-all"
              title="Cancel Selection"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
      )}

      {/* Info Modal */}
      {infoItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md animate-in fade-in duration-300 px-4">
          <div className="bg-[var(--card-bg)] border-[3px] border-[var(--border-color)] p-6 rounded-[32px] shadow-[8px_8px_0px_0px_var(--shadow-color)] flex flex-col gap-5 w-full max-w-sm animate-in zoom-in-90 duration-300">
            <div className="flex justify-between items-start border-b-2 border-[var(--border-color)] pb-4">
              <div className="flex items-center gap-3">
                <div className="text-4xl drop-shadow-[2px_2px_0px_var(--border-color)]">
                  {'hash' in infoItem ? '📄' : '📁'}
                </div>
                <div>
                  <h3 className="font-extrabold text-lg line-clamp-1 pr-4">{infoItem.name}</h3>
                  <p className="text-xs font-bold text-[var(--text-muted)]">
                    {'hash' in infoItem ? 'Encrypted File' : 'Directory'}
                  </p>
                </div>
              </div>
              <button onClick={() => setInfoItem(null)} className="w-8 h-8 flex-shrink-0 bg-[var(--bg-color)] border-2 border-[var(--border-color)] rounded-full flex items-center justify-center font-bold shadow-[2px_2px_0px_0px_var(--shadow-color)] active:translate-y-px active:translate-x-px active:shadow-none transition-all">
                ✕
              </button>
            </div>
            
            <div className="flex flex-col gap-3">
              {'hash' in infoItem ? (
                <>
                  <div className="flex justify-between items-center bg-[var(--bg-color)] border-2 border-[var(--border-color)] rounded-xl p-3 shadow-inner">
                    <span className="text-sm font-bold text-[var(--text-muted)]">File Size</span>
                    <span className="text-sm font-extrabold bg-[var(--accent-primary)] text-[var(--btn-text)] px-2 py-0.5 rounded border border-[var(--border-color)] shadow-[2px_2px_0px_0px_var(--shadow-color)]">
                      {(infoItem as Shard).size}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2 bg-[var(--bg-color)] border-2 border-[var(--border-color)] rounded-xl p-3 shadow-inner">
                    <span className="text-sm font-bold text-[var(--text-muted)]">Network Hash</span>
                    <span className="text-[11px] font-bold break-all bg-[var(--card-bg)] border-2 border-[var(--border-color)] rounded p-2 text-[var(--text-primary)] select-all shadow-[2px_2px_0px_0px_var(--shadow-color)]">
                      {(infoItem as Shard).hash}
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-[var(--bg-color)] border-2 border-[var(--border-color)] rounded-xl p-3 shadow-inner">
                    <span className="text-sm font-bold text-[var(--text-muted)]">Status</span>
                    <span className="text-sm font-extrabold text-green-500 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse border border-green-700"></span> Secured by Network</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between items-center bg-[var(--bg-color)] border-2 border-[var(--border-color)] rounded-xl p-3 shadow-inner">
                    <span className="text-sm font-bold text-[var(--text-muted)]">Contains</span>
                    <span className="text-sm font-extrabold text-[var(--text-primary)] bg-[var(--card-bg)] border-2 border-[var(--border-color)] px-2 py-0.5 rounded shadow-[2px_2px_0px_0px_var(--shadow-color)]">
                      {shards.filter(s => s.folderId === infoItem.id).length + folders.filter(f => f.parentId === infoItem.id).length} Items
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-[var(--bg-color)] border-2 border-[var(--border-color)] rounded-xl p-3 shadow-inner">
                    <span className="text-sm font-bold text-[var(--text-muted)]">Total Size</span>
                    <span className="text-sm font-extrabold bg-[var(--accent-primary)] text-[var(--btn-text)] px-2 py-0.5 rounded border border-[var(--border-color)] shadow-[2px_2px_0px_0px_var(--shadow-color)]">
                      {getFolderSizeMB(infoItem.id) < 0.1 ? "< 0.1 MB" : `${getFolderSizeMB(infoItem.id).toFixed(1)} MB`}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2 bg-[var(--bg-color)] border-2 border-[var(--border-color)] rounded-xl p-3 shadow-inner">
                    <span className="text-sm font-bold text-[var(--text-muted)]">Folder ID</span>
                    <span className="text-[11px] font-bold break-all text-[var(--text-primary)] select-all">
                      {infoItem.id}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upload Overlay */}
      {uploadProgress !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md animate-in fade-in duration-300 px-4">
          <div className="bg-[var(--card-bg)] border-[3px] border-[var(--border-color)] p-8 rounded-[32px] shadow-[8px_8px_0px_0px_var(--shadow-color)] flex flex-col items-center gap-6 w-full max-w-sm animate-in zoom-in-90 duration-300">
            <h3 className="text-xl font-extrabold text-center text-[var(--text-primary)]">
              {uploadError ? "Upload Failed" : uploadProgress === 100 ? "Complete!" : "Uploading"}
              <br/><span className="text-[var(--text-muted)] text-sm">{uploadingFileName}</span>
            </h3>
            
            {/* Circular Progress SVG / Result Icon */}
            <div className="relative w-32 h-32 flex items-center justify-center">
              {uploadError ? (
                <div className="w-full h-full bg-[#ff6b6b] border-[6px] border-[var(--border-color)] rounded-full flex items-center justify-center shadow-[4px_4px_0px_0px_var(--shadow-color)] animate-in zoom-in duration-300">
                  <svg className="w-16 h-16 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              ) : uploadProgress === 100 ? (
                <div className="w-full h-full bg-[#34d399] border-[6px] border-[var(--border-color)] rounded-full flex items-center justify-center shadow-[4px_4px_0px_0px_var(--shadow-color)] animate-in zoom-in duration-300">
                  <svg className="w-16 h-16 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              ) : (
                <>
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" className="stroke-[var(--bg-color)] stroke-[8px] fill-none" />
                    <circle 
                      cx="50" cy="50" r="40" 
                      className="stroke-[var(--accent-secondary)] stroke-[8px] fill-none transition-all duration-300 ease-out" 
                      strokeDasharray="251.2" 
                      strokeDashoffset={251.2 - (251.2 * uploadProgress) / 100} 
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute text-3xl font-extrabold text-[var(--text-primary)]">{uploadProgress}%</span>
                </>
              )}
            </div>

            <p className={`font-bold text-sm text-center px-4 ${uploadError ? "text-[#ff6b6b]" : "text-[var(--text-muted)] animate-pulse"}`}>
              {uploadError ? uploadError : uploadProgress === 100 ? "Secured on network." : uploadStatus}
            </p>

            {uploadError ? (
              <button 
                onClick={() => { 
                  setUploadProgress(null); 
                  setUploadError(null); 
                  if (uploadError === "Vault Storage Full.") setActiveTab("UPGRADE");
                }} 
                className={`border-2 border-[var(--border-color)] px-8 py-3 rounded-full font-bold shadow-[2px_2px_0px_0px_var(--shadow-color)] active:translate-y-px active:translate-x-px active:shadow-none transition-all w-full ${uploadError === "Vault Storage Full." ? "bg-[#34d399] text-black hover:bg-green-400" : "bg-[var(--card-bg)] text-[var(--text-primary)]"}`}
              >
                {uploadError === "Vault Storage Full." ? "Upgrade Storage" : "Close"}
              </button>
            ) : uploadProgress < 100 && (
              <button 
                onClick={cancelUpload} 
                className="bg-[#ff6b6b] text-black border-2 border-[var(--border-color)] px-8 py-3 rounded-full font-bold shadow-[2px_2px_0px_0px_var(--shadow-color)] active:translate-y-px active:translate-x-px active:shadow-none transition-all hover:bg-red-400 w-full"
              >
                Cancel Upload
              </button>
            )}
          </div>
        </div>
      )}

      {/* Download Overlay */}
      {downloadProgress !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md animate-in fade-in duration-300 px-4">
          <div className="bg-[var(--card-bg)] border-[3px] border-[var(--border-color)] p-8 rounded-[32px] shadow-[8px_8px_0px_0px_var(--shadow-color)] flex flex-col items-center gap-6 w-full max-w-sm animate-in zoom-in-90 duration-300">
            <h3 className="text-xl font-extrabold text-center text-[var(--text-primary)]">
              {downloadError ? "Download Failed" : downloadProgress === 100 ? "Complete!" : "Downloading"}
              <br/><span className="text-[var(--text-muted)] text-sm">{downloadingFileName}</span>
            </h3>
            
            {/* Circular Progress SVG / Result Icon */}
            <div className="relative w-32 h-32 flex items-center justify-center">
              {downloadError ? (
                <div className="w-full h-full bg-[#ff6b6b] border-[6px] border-[var(--border-color)] rounded-full flex items-center justify-center shadow-[4px_4px_0px_0px_var(--shadow-color)] animate-in zoom-in duration-300">
                  <svg className="w-16 h-16 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              ) : downloadProgress === 100 ? (
                <div className="w-full h-full bg-[#34d399] border-[6px] border-[var(--border-color)] rounded-full flex items-center justify-center shadow-[4px_4px_0px_0px_var(--shadow-color)] animate-in zoom-in duration-300">
                  <svg className="w-16 h-16 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              ) : (
                <>
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" className="stroke-[var(--bg-color)] stroke-[8px] fill-none" />
                    <circle 
                      cx="50" cy="50" r="40" 
                      className="stroke-[var(--accent-primary)] stroke-[8px] fill-none transition-all duration-300 ease-out" 
                      strokeDasharray="251.2" 
                      strokeDashoffset={251.2 - (251.2 * downloadProgress) / 100} 
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute text-3xl font-extrabold text-[var(--text-primary)]">{downloadProgress}%</span>
                </>
              )}
            </div>

            <p className={`font-bold text-sm text-center px-4 ${downloadError ? "text-[#ff6b6b]" : "text-[var(--text-muted)] animate-pulse"}`}>
              {downloadError ? downloadError : downloadProgress === 100 ? "Files saved securely." : "Decrypting shards & rebuilding..."}
            </p>

            {downloadError ? (
              <button 
                onClick={() => { setDownloadProgress(null); setDownloadError(null); }} 
                className="bg-[var(--card-bg)] text-[var(--text-primary)] border-2 border-[var(--border-color)] px-8 py-3 rounded-full font-bold shadow-[2px_2px_0px_0px_var(--shadow-color)] active:translate-y-px active:translate-x-px active:shadow-none transition-all w-full"
              >
                Close
              </button>
            ) : downloadProgress < 100 && (
              <button 
                onClick={cancelDownload} 
                className="bg-[#ff6b6b] text-black border-2 border-[var(--border-color)] px-8 py-3 rounded-full font-bold shadow-[2px_2px_0px_0px_var(--shadow-color)] active:translate-y-px active:translate-x-px active:shadow-none transition-all hover:bg-red-400 w-full"
              >
                Cancel Download
              </button>
            )}
          </div>
        </div>
      )}

      {/* Mobile-Width Container */}
      <div className="w-full max-w-md relative flex flex-col pb-[calc(100px+env(safe-area-inset-bottom))]">
        
        {/* Header */}
        <header className="neo-header px-6 py-5 sticky top-0 z-20 flex flex-col items-center gap-2 mt-4 mx-4 mb-2">
          
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)} 
            className="absolute top-5 right-5 w-9 h-9 flex items-center justify-center bg-[var(--card-bg)] border-2 border-[var(--border-color)] rounded-full shadow-[2px_2px_0px_0px_var(--shadow-color)] active:translate-y-px active:translate-x-px active:shadow-[0px_0px_0px_0px_var(--shadow-color)] transition-all text-sm"
          >
            {isDarkMode ? "☀️" : "🌙"}
          </button>

          <div className="flex items-center gap-2.5">
            <svg className="w-8 h-8 text-[var(--text-primary)] drop-shadow-[2px_2px_0px_var(--shadow-color)]" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="40" height="40" rx="12" fill="currentColor"/>
              <path d="M11 26V14" stroke="var(--bg-color)" strokeWidth="3.5" strokeLinecap="round"/>
              <path d="M11 19 A 4.5 4.5 0 0 1 20 19 V 26" stroke="var(--bg-color)" strokeWidth="3.5" strokeLinecap="round"/>
              <path d="M20 19 A 4.5 4.5 0 0 1 29 19 V 21" stroke="var(--bg-color)" strokeWidth="3.5" strokeLinecap="round"/>
              <circle cx="29" cy="26" r="2.25" fill="var(--bg-color)"/>
            </svg>
            <span className="text-[26px] font-extrabold tracking-tighter mt-1">Mini Drive</span>
          </div>
          {address ? (
            <div className="bg-[var(--card-bg)] border-2 border-[var(--border-color)] rounded-full px-4 py-1.5 flex items-center gap-2 shadow-[2px_2px_0px_0px_var(--shadow-color)] text-[var(--text-primary)]">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500 border border-[var(--border-color)] animate-pulse"></div>
              <span className="text-xs font-bold">
                {address.slice(0, 6)}...{address.slice(-4)}
              </span>
            </div>
          ) : (
            <button onClick={connectWallet} disabled={loading} className="neo-btn mt-1 text-sm px-6 py-2">
              {loading ? "Connecting..." : "Connect Wallet"}
            </button>
          )}
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 px-4 py-4 overflow-y-auto overflow-x-hidden flex flex-col gap-6">


          {address && activeTab === "NODE" && (
            <div className="flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-300">
              <div className="neo-card p-6 flex flex-col gap-6">
                <div className="flex items-center justify-between border-b-2 border-[var(--border-color)] pb-4">
                  <h2 className="text-xl font-extrabold">Storage Node</h2>
                  {isNodeActive ? (
                    <span className="bg-[var(--accent-secondary)] text-[var(--btn-text)] text-xs px-3 py-1.5 rounded-full border-2 border-[var(--border-color)] flex items-center gap-1.5 font-bold shadow-[2px_2px_0px_0px_var(--shadow-color)]">
                      <span className="w-2 h-2 rounded-full bg-green-500 border border-[var(--border-color)] animate-pulse"></span>
                      Active
                    </span>
                  ) : (
                    <span className="bg-[var(--text-muted)] text-[var(--btn-text)] text-xs px-3 py-1.5 rounded-full border-2 border-[var(--border-color)] flex items-center gap-1.5 font-bold shadow-[2px_2px_0px_0px_var(--shadow-color)]">
                      <span className="w-2 h-2 rounded-full bg-black border border-black"></span>
                      Inactive
                    </span>
                  )}
                </div>
                
                <div className="space-y-5">
                  {!isNodeActive ? (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-sm font-bold mb-2">
                        <span>Allocate Storage</span>
                        <span className="text-[var(--text-primary)] bg-[var(--card-bg)] border-2 border-[var(--border-color)] px-3 py-1 rounded-full shadow-[2px_2px_0px_0px_var(--shadow-color)]">{allocatedStorage} GB</span>
                      </div>
                      <input 
                        type="range" 
                        min="10" 
                        max="1000" 
                        step="10" 
                        value={allocatedStorage}
                        onChange={(e) => setAllocatedStorage(Number(e.target.value))}
                        className="w-full h-3 bg-[var(--bg-color)] rounded-full border-2 border-[var(--border-color)] appearance-none cursor-pointer"
                        style={{ accentColor: "var(--accent-secondary)" }}
                      />
                      <p className="text-[11px] font-bold text-[var(--text-muted)]">
                        Select how much free space you want to provide to the network.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm font-bold">
                        <span>Storage Filled</span>
                        <span>{((allocatedStorage * 0.24)).toFixed(1)} GB / {allocatedStorage} GB</span>
                      </div>
                      <div className="w-full h-4 bg-[var(--bg-color)] rounded-full border-2 border-[var(--border-color)] overflow-hidden shadow-inner">
                        <div className="h-full bg-[var(--text-primary)] w-[24%] border-r-2 border-[var(--border-color)] animate-pulse"></div>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-3">
                    <div className="bg-[var(--accent-primary)] text-[var(--btn-text)] rounded-[16px] p-4 flex justify-between items-center border-2 border-[var(--border-color)] shadow-[4px_4px_0px_0px_var(--shadow-color)]">
                      <span className="text-sm font-bold">Total Earned</span>
                      <span className="text-xl font-extrabold">
                        {totalEarned} USDm
                      </span>
                    </div>
                    
                    <button 
                      onClick={() => setShowEarningDetails(!showEarningDetails)}
                      className="text-xs font-extrabold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors self-center bg-[var(--bg-color)] px-4 py-1.5 rounded-full border-2 border-[var(--border-color)] shadow-[2px_2px_0px_0px_var(--shadow-color)] active:translate-y-px active:translate-x-px active:shadow-none"
                    >
                      {showEarningDetails ? "Hide Earning Details ↑" : "View Earning Details ↓"}
                    </button>
                    
                    {showEarningDetails && (
                      <div className="bg-[var(--bg-color)] border-2 border-[var(--border-color)] rounded-xl p-4 text-xs font-bold flex flex-col gap-3 shadow-inner animate-in slide-in-from-top-2 duration-200">
                        <div className="flex justify-between border-b-2 border-dashed border-[var(--border-color)] pb-2">
                          <span className="text-[var(--text-muted)]">Base Network Rate</span>
                          <span className="text-[var(--text-primary)]">0.05 USDm / GB / Month</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[var(--text-muted)]">Est. Monthly Yield</span>
                          <span className="text-[var(--accent-primary)] font-extrabold text-sm bg-[var(--card-bg)] px-2 py-0.5 rounded border border-[var(--border-color)] shadow-[2px_2px_0px_0px_var(--shadow-color)]">
                            ~{(allocatedStorage * 0.05).toFixed(2)} USDm
                          </span>
                        </div>
                        <div className="mt-1 text-[10px] text-[var(--text-muted)] leading-relaxed p-2 bg-[var(--card-bg)] rounded-lg border-2 border-[var(--border-color)]">
                          * Rewards are distributed automatically by the Escrow smart contract upon successful cryptographic proofs of storage (PoS). If your node drops offline, rewards pause.
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="pt-2">
                  {!isNodeActive ? (
                    <button onClick={registerNode} disabled={loading} className="neo-btn-primary w-full text-lg py-4">
                      Initialize Node
                    </button>
                  ) : (
                    <button disabled className="w-full bg-[var(--bg-color)] text-[var(--text-muted)] border-2 border-[var(--border-color)] rounded-full px-6 py-4 font-bold cursor-not-allowed shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]">
                      Node is Running
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {address && activeTab === "UPGRADE" && (
            <div className="flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-300">
              <div className="neo-card p-6 flex flex-col gap-5">
                <div className="border-b-2 border-[var(--border-color)] pb-4">
                  <h2 className="text-2xl font-extrabold">Upgrade Storage</h2>
                  <p className="text-sm font-bold text-[var(--text-muted)] mt-1">Deposit USDm to fund the decentralized storage network and securely host your vault.</p>
                </div>
                
                <div className="bg-[var(--card-bg)] rounded-[16px] p-4 flex justify-between items-center border-2 border-[var(--border-color)] shadow-[4px_4px_0px_0px_var(--shadow-color)]">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Your Escrow</span>
                    <span className="text-lg font-extrabold">{userEscrow.toFixed(2)} USDm</span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Storage Limit</span>
                    <span className="text-lg font-extrabold text-[var(--accent-primary)]">{maxStorage >= 1000 ? `${(maxStorage/1000).toFixed(1)} GB` : `${maxStorage} MB`}</span>
                  </div>
                </div>
                
                <div className="flex flex-col gap-4 pt-2">
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      placeholder="Amount"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      className="neo-input flex-1 py-4 text-lg"
                    />
                    <span className="font-extrabold text-lg">USDm</span>
                  </div>
                  <button onClick={depositToEscrow} disabled={loading || !depositAmount} className="neo-btn w-full text-lg py-4 bg-[#34d399] text-black">
                    Fund Escrow
                  </button>
                </div>
                
                <div className="bg-[var(--bg-color)] border-2 border-[var(--border-color)] rounded-xl p-4 text-xs font-bold text-[var(--text-muted)] text-center shadow-inner">
                  1 USDm provides roughly 5 GB of secure, encrypted decentralized storage for 1 month.
                </div>
              </div>
            </div>
          )}

          {address && activeTab === "VAULT" && (
            <div className="flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-300">
              
              {/* FILE EXPLORER */}
              <div className="neo-card p-6 flex flex-col gap-6">
                <div className="flex justify-between items-center border-b-2 border-[var(--border-color)] pb-4">
                  <div className="flex items-center gap-3">
                    {currentFolder && (
                      <button 
                        onClick={() => setCurrentFolder(folders.find(f => f.id === currentFolder)?.parentId || null)} 
                        className="bg-[var(--card-bg)] border-2 border-[var(--border-color)] rounded-full w-8 h-8 flex items-center justify-center font-bold shadow-[2px_2px_0px_0px_var(--shadow-color)] active:translate-y-px active:translate-x-px active:shadow-none transition-all"
                      >
                        ←
                      </button>
                    )}
                    <h2 className="text-xl font-extrabold">
                      {currentFolder ? folders.find(f => f.id === currentFolder)?.name : "My Vault"}
                    </h2>
                  </div>
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={createFolder}
                      className="bg-[var(--accent-secondary)] text-[var(--btn-text)] border-2 border-[var(--border-color)] rounded-full w-9 h-9 flex items-center justify-center font-extrabold shadow-[2px_2px_0px_var(--shadow-color)] active:translate-y-px active:translate-x-px active:shadow-none transition-all"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Storage Bar */}
                <div className="bg-[var(--bg-color)] border-2 border-[var(--border-color)] rounded-xl p-3 shadow-inner -mt-2 mb-2">
                  <div className="flex justify-between text-[11px] font-bold mb-2">
                    <span className="text-[var(--text-muted)] uppercase tracking-wider">Vault Storage</span>
                    <span className="text-[var(--text-primary)]">{usedStorage.toFixed(1)} MB / {maxStorage >= 1000 ? `${(maxStorage/1000).toFixed(1)} GB` : `${maxStorage} MB`}</span>
                  </div>
                  <div className="w-full h-2.5 bg-[var(--card-bg)] rounded-full border border-[var(--border-color)] overflow-hidden shadow-inner">
                    <div 
                      className={`h-full border-r border-[var(--border-color)] transition-all duration-500 ${usedStorage > maxStorage * 0.9 ? 'bg-[#ff6b6b]' : 'bg-[var(--accent-primary)]'}`}
                      style={{ width: `${Math.min((usedStorage / maxStorage) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* FOLDERS */}
                  {folders.filter(f => f.parentId === currentFolder).map(f => {
                    const isSelected = selectedItems.has(f.id);
                    return (
                      <div 
                        key={f.id} 
                        onClick={(e) => {
                          if (isLongPress.current) { e.preventDefault(); return; }
                          setCurrentFolder(f.id);
                        }}
                        onTouchStart={() => handlePressStart(f)}
                        onTouchEnd={handlePressEnd}
                        onTouchMove={handlePressEnd}
                        onMouseDown={() => handlePressStart(f)}
                        onMouseUp={handlePressEnd}
                        onMouseLeave={handlePressEnd}
                        className={`border-2 border-[var(--border-color)] rounded-[20px] p-5 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all relative group ${isSelected ? "bg-[var(--accent-secondary)] shadow-none translate-y-px translate-x-px" : "bg-[var(--bg-color)] shadow-[4px_4px_0px_0px_var(--shadow-color)] hover:-translate-y-1 hover:shadow-[4px_6px_0px_0px_var(--shadow-color)]"}`}
                      >
                        {/* Checkbox Overlay */}
                        <div 
                          onClick={(e) => toggleSelection(e, f.id)}
                          className={`absolute top-2 left-2 w-6 h-6 rounded-full border-2 border-[var(--border-color)] flex items-center justify-center cursor-pointer transition-colors shadow-[2px_2px_0px_0px_var(--shadow-color)] ${isSelected ? "bg-[var(--accent-primary)] text-[var(--btn-text)] shadow-none translate-y-px translate-x-px" : "bg-[var(--card-bg)] text-transparent"}`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>
                        </div>

                        <div className="text-4xl drop-shadow-[2px_2px_0px_var(--border-color)] mt-2">📁</div>
                        <span className={`font-extrabold text-sm text-center line-clamp-1 ${isSelected ? "text-[var(--btn-text)]" : ""}`}>{f.name}</span>

                        {/* Download Arrow Button */}
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            startDownload(f.name + ".zip");
                          }}
                          className={`absolute -bottom-2 -right-2 w-8 h-8 border-2 border-[var(--border-color)] rounded-full flex items-center justify-center shadow-[2px_2px_0px_0px_var(--shadow-color)] active:translate-y-px active:translate-x-px active:shadow-none transition-all hover:scale-110 z-10 ${isSelected ? "bg-[var(--card-bg)] text-[var(--text-primary)]" : "bg-[var(--accent-secondary)] text-[var(--btn-text)]"}`}
                          title="Download Folder"
                        >
                          <svg className="w-4 h-4 ml-0.5 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </button>
                      </div>
                    );
                  })}

                  {/* FILES */}
                  {shards.filter(s => s.folderId === currentFolder).map((s, i) => {
                    const isSelected = selectedItems.has(s.id);
                    return (
                      <div 
                        key={s.id}
                        onClick={(e) => {
                          if (isLongPress.current) { e.preventDefault(); return; }
                        }}
                        onTouchStart={() => handlePressStart(s)}
                        onTouchEnd={handlePressEnd}
                        onTouchMove={handlePressEnd}
                        onMouseDown={() => handlePressStart(s)}
                        onMouseUp={handlePressEnd}
                        onMouseLeave={handlePressEnd}
                        className={`border-2 border-[var(--border-color)] rounded-[20px] p-4 flex flex-col justify-between gap-3 group transition-colors relative cursor-pointer ${isSelected ? "bg-[var(--accent-secondary)] shadow-none translate-y-px translate-x-px" : "bg-[var(--card-bg)] shadow-[4px_4px_0px_0px_var(--shadow-color)] hover:bg-[var(--bg-color)]"}`}
                      >
                        {/* Checkbox Overlay */}
                        <div 
                          onClick={(e) => toggleSelection(e, s.id)}
                          className={`absolute -top-2 -left-2 w-7 h-7 rounded-full border-2 border-[var(--border-color)] flex items-center justify-center cursor-pointer transition-all z-10 shadow-[2px_2px_0px_0px_var(--shadow-color)] ${isSelected ? "bg-[var(--accent-primary)] text-[var(--btn-text)] shadow-none translate-y-px translate-x-px" : "bg-[var(--card-bg)] text-transparent"}`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>
                        </div>

                        <div className="flex justify-between items-start mt-2">
                          <div className="text-3xl drop-shadow-[2px_2px_0px_var(--border-color)]">📄</div>
                          <span className={`text-[10px] font-bold border-2 border-[var(--border-color)] px-2 py-0.5 rounded-full shadow-[2px_2px_0px_0px_var(--shadow-color)] ${isSelected ? "bg-[var(--bg-color)] text-[var(--text-primary)]" : "bg-[var(--accent-primary)] text-[var(--btn-text)]"}`}>
                            {s.size}
                          </span>
                        </div>
                        
                        <div>
                          <span className={`font-extrabold text-sm line-clamp-2 leading-tight pr-6 pb-6 ${isSelected ? "text-[var(--btn-text)]" : ""}`}>{s.name}</span>
                        </div>

                        {/* Download Arrow Button */}
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            startDownload(s.name); 
                          }}
                          className={`absolute -bottom-2 -right-2 w-8 h-8 border-2 border-[var(--border-color)] rounded-full flex items-center justify-center shadow-[2px_2px_0px_0px_var(--shadow-color)] active:translate-y-px active:translate-x-px active:shadow-none transition-all hover:scale-110 z-10 ${isSelected ? "bg-[var(--card-bg)] text-[var(--text-primary)]" : "bg-[var(--accent-secondary)] text-[var(--btn-text)]"}`}
                          title="Download File"
                        >
                          <svg className="w-4 h-4 ml-0.5 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </button>

                      </div>
                    );
                  })}
                </div>

                {/* EMPTY STATE */}
                {folders.filter(f => f.parentId === currentFolder).length === 0 && shards.filter(s => s.folderId === currentFolder).length === 0 && (
                  <div className="py-8 border-2 border-dashed border-[var(--border-color)] rounded-[20px] flex flex-col items-center justify-center text-center gap-2">
                    <span className="text-3xl opacity-50">📂</span>
                    <span className="text-sm font-bold text-[var(--text-muted)]">This folder is empty.</span>
                  </div>
                )}

                <button onClick={simulateUpload} disabled={loading || uploadProgress !== null} className="neo-btn-primary w-full text-lg py-4 mt-2">
                  Upload File Here
                </button>
              </div>

              {/* RETRIEVE / DOWNLOAD */}
              <div className="neo-card p-6 flex flex-col gap-4">
                <h2 className="text-lg font-extrabold">Download by Hash</h2>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Qm..."
                    value={retrieveHash}
                    onChange={(e) => setRetrieveHash(e.target.value)}
                    className="neo-input font-bold text-sm py-3 px-4"
                  />
                  <button onClick={simulateDownload} disabled={loading || !retrieveHash} className="neo-btn px-6 bg-[var(--accent-secondary)]">
                    Get
                  </button>
                </div>
              </div>

            </div>
          )}

          {!address && (
            <div className="flex-1 flex flex-col items-center justify-center text-center mt-16 animate-in fade-in duration-500">
              <div className="w-28 h-28 bg-[var(--text-primary)] rounded-[32px] flex items-center justify-center mb-6 border-[3px] border-[var(--border-color)] shadow-[8px_8px_0px_0px_var(--shadow-color)] text-[var(--bg-color)]">
                <svg className="w-16 h-16" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M11 26V14" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
                  <path d="M11 19 A 4.5 4.5 0 0 1 20 19 V 26" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
                  <path d="M20 19 A 4.5 4.5 0 0 1 29 19 V 21" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
                  <circle cx="29" cy="26" r="2.5" fill="currentColor"/>
                </svg>
              </div>
              <h2 className="text-4xl font-extrabold tracking-tighter mb-3">Mini Drive</h2>
              <p className="text-sm font-bold text-[var(--text-muted)] max-w-[250px] leading-relaxed bg-[var(--card-bg)] border-2 border-[var(--border-color)] p-4 rounded-2xl shadow-[4px_4px_0px_0px_var(--shadow-color)]">
                Connect your wallet to access the storage network.
              </p>
            </div>
          )}
        </main>

        {/* Fixed Bottom Navigation */}
        <footer className="fixed bottom-0 w-full max-w-md z-50 pb-[calc(16px+env(safe-area-inset-bottom))] px-4">
          <div className="bg-[var(--card-bg)] border-2 border-[var(--border-color)] rounded-full p-1.5 flex relative shadow-[4px_4px_0px_0px_var(--shadow-color)]">
            <button 
              onClick={() => setActiveTab("VAULT")}
              className={`flex-1 py-3 text-sm font-extrabold rounded-full transition-all duration-300 z-10 ${
                activeTab === "VAULT" 
                  ? "text-[var(--btn-text)]" 
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              Vault
            </button>
            <button 
              onClick={() => setActiveTab("UPGRADE")}
              className={`flex-1 py-3 text-sm font-extrabold rounded-full transition-all duration-300 z-10 ${
                activeTab === "UPGRADE" 
                  ? "text-[var(--btn-text)]" 
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              Upgrade
            </button>
            <button 
              onClick={() => setActiveTab("NODE")}
              className={`flex-1 py-3 text-sm font-extrabold rounded-full transition-all duration-300 z-10 ${
                activeTab === "NODE" 
                  ? "text-[var(--btn-text)]" 
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              Node
            </button>
            
            {/* Sliding Pill Indicator */}
            <div className={`absolute top-1.5 bottom-1.5 w-[calc(33.333%-4px)] bg-[var(--accent-primary)] border-2 border-[var(--border-color)] rounded-full transition-transform duration-300 ease-out shadow-[2px_2px_0px_0px_var(--shadow-color)] ${
              activeTab === "VAULT" ? "translate-x-0" : 
              activeTab === "UPGRADE" ? "translate-x-[calc(100%+3px)]" : 
              "translate-x-[calc(200%+6px)]"
            }`} />
          </div>
        </footer>

      </div>
    </div>
  );
}

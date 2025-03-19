import { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import './App.css';

interface TabInfo {
  id: string;
  createdAt: number;
  lastHeartbeat: number;
}

interface TabMessage {
  type: 'announce' | 'request-announce' | 'activate' | 'tab-closed' | 'sync-request' | 'sync-data' | 'heartbeat';
  tabId?: string;
  createdAt?: number;
  lastHeartbeat?: number;
  tabs?: TabInfo[];
}

function App() {
  const [tabId] = useState<string>(() => {
    const existingId = sessionStorage.getItem('tab-id');
    if (existingId) return existingId;
    const newId = uuidv4();
    sessionStorage.setItem('tab-id', newId);
    return newId;
  });

  const [createdAt] = useState<number>(() => {
    const timestamp = sessionStorage.getItem('tab-created');
    if (timestamp) return parseInt(timestamp);
    const now = Date.now();
    sessionStorage.setItem('tab-created', now.toString());
    return now;
  });


  const [tabNumber, setTabNumber] = useState<number>(1);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [knownTabs, setKnownTabs] = useState<TabInfo[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  const channelRef = useRef<BroadcastChannel | null>(null);
  const pulsingIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    const channel = new BroadcastChannel('tab-coordination');
    channelRef.current = channel;

    const announceTab = () => {
      channel.postMessage({
        type: 'announce',
        tabId,
        createdAt,
        lastHeartbeat: Date.now()
      } as TabMessage);
    };

    const sendHeartbeat = () => {
      channel.postMessage({
        type: 'heartbeat',
        tabId,
        lastHeartbeat: Date.now()
      } as TabMessage);
    };

    const checkForActiveTab = () => {
      setTimeout(() => {
        if (activeTabId === null) {
          activateTab(tabId);
        }
      }, 300);
    };

    announceTab();
    channel.postMessage({ type: 'request-announce' } as TabMessage);
    checkForActiveTab();


    channel.onmessage = (event: MessageEvent) => {
      const message = event.data as TabMessage;

      switch (message.type) {
        case 'announce':
          if (message.tabId && message.tabId !== tabId && message.createdAt) {
            updateTabsList(message.tabId, message.createdAt, message.lastHeartbeat || Date.now());
          }
          break;

        case 'heartbeat':
          if (message.tabId && message.tabId !== tabId && message.lastHeartbeat) {
            updateTabHeartbeat(message.tabId, message.lastHeartbeat);
          }
          break;

        case 'request-announce':
          announceTab();
          break;

        case 'activate':
          if (message.tabId) {
            setActiveTabId(message.tabId);
            setIsActive(message.tabId === tabId);
          }
          break;

        case 'tab-closed':
          if (message.tabId) {
            setKnownTabs(prev => prev.filter(tab => tab.id !== message.tabId));
            if (activeTabId === message.tabId) {
              setActiveTabId(null);
              setIsActive(false);
            }
          }
          break;

        case 'sync-request':
          channel.postMessage({
            type: 'sync-data',
            tabs: [...knownTabs, { id: tabId, createdAt, lastHeartbeat: Date.now() }]
          } as TabMessage);
          break;

        case 'sync-data':
          if (message.tabs) {
            const filteredTabs = message.tabs.filter(tab => tab.id !== tabId);
            setKnownTabs(prev => {
              const result = [...prev];
              filteredTabs.forEach(newTab => {
                const existingIndex = result.findIndex(tab => tab.id === newTab.id);
                if (existingIndex >= 0) {
                  result[existingIndex] = {
                    ...result[existingIndex],
                    lastHeartbeat: Math.max(result[existingIndex].lastHeartbeat, newTab.lastHeartbeat)
                  };
                } else {
                  result.push(newTab);
                }
              });
              return result;
            });
          }
          break;
      }
    };


    const handleBeforeUnload = () => {
      channel.postMessage({
        type: 'tab-closed',
        tabId
      } as TabMessage);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);


    const heartbeatInterval = window.setInterval(sendHeartbeat, 1000);
    const cleanupInterval = window.setInterval(() => {
      const now = Date.now();
      setKnownTabs(prev => prev.filter(tab => now - tab.lastHeartbeat < 5000));
    }, 2000);


    setTimeout(() => {
      channel.postMessage({ type: 'sync-request' } as TabMessage);


      setTimeout(() => {

        if (activeTabId === null) {
          activateTab(tabId);
        }
      }, 300);
    }, 300);

    return () => {
      clearInterval(heartbeatInterval);
      clearInterval(cleanupInterval);
      if (pulsingIntervalRef.current) window.clearInterval(pulsingIntervalRef.current);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      channel.close();
    };
  }, [tabId, createdAt, activeTabId]);


  useEffect(() => {
    const allTabs = getAllTabs();
    const index = allTabs.findIndex(tab => tab.id === tabId);
    if (index !== -1) setTabNumber(index + 1);
  }, [knownTabs, tabId]);


  useEffect(() => {
    updateFavicon(tabNumber, isActive);
  }, [tabNumber, isActive]);


  const getAllTabs = (): TabInfo[] => {
    return [...knownTabs, { id: tabId, createdAt, lastHeartbeat: Date.now() }]
      .sort((a, b) => a.createdAt - b.createdAt);
  };

  const updateTabsList = (newTabId: string, tabCreatedAt: number, lastHeartbeat: number) => {
    setKnownTabs(prev => {
      const existingIndex = prev.findIndex(tab => tab.id === newTabId);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          lastHeartbeat: Math.max(updated[existingIndex].lastHeartbeat, lastHeartbeat)
        };
        return updated;
      }
      return [...prev, { id: newTabId, createdAt: tabCreatedAt, lastHeartbeat }];
    });
  };

  const updateTabHeartbeat = (tabId: string, heartbeat: number) => {
    setKnownTabs(prev => {
      const existingIndex = prev.findIndex(tab => tab.id === tabId);
      if (existingIndex === -1) return prev;
      const updated = [...prev];
      updated[existingIndex] = {
        ...updated[existingIndex],
        lastHeartbeat: Math.max(updated[existingIndex].lastHeartbeat, heartbeat)
      };
      return updated;
    });
  };

  const activateTab = (targetTabId: string) => {
    if (!channelRef.current) return;

    const activationTime = Date.now();

    channelRef.current.postMessage({
      type: 'activate',
      tabId: targetTabId,
      lastHeartbeat: activationTime
    } as TabMessage);


    setActiveTabId(targetTabId);
    setIsActive(targetTabId === tabId);
  };

  const updateFavicon = (number: number, active: boolean) => {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = active ? '#FFEB3B' : '#FFFFFF';
    ctx.fillRect(0, 0, 32, 32);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, 30, 30);

    ctx.fillStyle = '#000000';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(number.toString(), 16, 16);

    const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement || document.createElement('link');
    link.rel = 'shortcut icon';
    link.href = canvas.toDataURL();
    document.head.appendChild(link);
    document.title = `Tab ${number}${active ? ' (ACTIVE)' : ''}`;

    active ? startPulsingFavicon(number) : stopPulsingFavicon();
  };

  const startPulsingFavicon = (number: number) => {
    if (pulsingIntervalRef.current) window.clearInterval(pulsingIntervalRef.current);

    let pulseState = true;
    pulsingIntervalRef.current = window.setInterval(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 32;
      canvas.height = 32;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = pulseState ? '#FFEB3B' : '#FFC107';
      ctx.fillRect(0, 0, 32, 32);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, 30, 30);

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 20px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(number.toString(), 16, 16);

      const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
      if (link) link.href = canvas.toDataURL();

      pulseState = !pulseState;
    }, 500);
  };

  const stopPulsingFavicon = () => {
    if (pulsingIntervalRef.current) {
      window.clearInterval(pulsingIntervalRef.current);
      pulsingIntervalRef.current = null;
    }
  };


  return (
    <div className={`tab-container ${isActive ? 'active' : ''}`}>
      <h1>Tab #{tabNumber}</h1>

      <div className="status-badge">
        Status: <span className={`status ${isActive ? 'active' : 'inactive'}`}>
          {isActive ? 'ACTIVE' : 'Inactive'}
        </span>
      </div>

      <p>Total tabs: {getAllTabs().length}</p>

      <div className="tab-list">
        <h3>All Tabs:</h3>
        <ul>
          {getAllTabs().map((tab, index) => (
            <li
              key={tab.id}
              className={`tab-item ${tab.id === tabId ? 'current' : ''} ${tab.id === activeTabId ? 'active' : ''}`}
              onClick={() => activateTab(tab.id)}
            >
              Tab #{index + 1}
              {tab.id === tabId ? ' (This Tab)' : ''}
              {tab.id === activeTabId ? ' [ACTIVE]' : ''}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default App;
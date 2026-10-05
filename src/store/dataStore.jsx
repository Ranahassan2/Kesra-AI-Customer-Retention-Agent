import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { analyzeAll, computeStats, simulateLiveDrift } from '../lib/ai-engine';
import { analyzeCustomerBatch } from '../lib/geminiService';
import { groqAnalyzeCustomerBatch, isGroqAvailable } from '../lib/groqService';
import { get, set, del } from 'idb-keyval';
import { supabase } from '../lib/supabase';

const DataContext = createContext(null);

const STORAGE_KEY = 'retention_data_v1';
const LIVE_INTERVAL_MS = 30000; // 30 seconds

export function DataProvider({ children }) {
  const [state, setState] = useState({
    customers: [],
    stats: null,
    columnMapping: {},
    fileName: null,
    uploadedAt: null,
    isAnalyzing: false,
    isLive: false,
    liveAlerts: [],
    isInitializing: true,
    customAlerts: [],
    uploads: [],
    lastAnalyzedAt: null,
    activityLogs: [],
  });

  useEffect(() => {
    async function loadData() {
      try {
        console.log('Fetching from Supabase...');
        const { data, error } = await supabase.from('store_data').select('data').eq('id', 'main-store').single();
        console.log('Supabase fetch result:', { data, error });
        
        if (error) {
          console.warn('Supabase returned an error:', error);
        } else if (data && data.data) {
          console.log('Successfully loaded from Supabase, applying state...');
          // Prevent React duplicate key errors from old corrupted data
          if (data.data.customers) {
            const unique = [];
            const seen = new Set();
            for (const c of data.data.customers) {
              if (!seen.has(c.id)) {
                unique.push(c);
                seen.add(c.id);
              }
            }
            data.data.customers = unique;
          }
          setState((prev) => ({ ...prev, ...data.data, isLive: false, liveAlerts: [], isInitializing: false, activityLogs: data.data.activityLogs || [] }));
          set(STORAGE_KEY, data.data).catch(() => {});
          return;
        }
      } catch (err) {
        console.error('Exception while loading from Supabase:', err);
      }

      console.log('Falling back to IndexedDB...');
      get(STORAGE_KEY)
        .then((saved) => {
          if (saved) {
            console.log('Loaded from IndexedDB');
            setState((prev) => ({ ...prev, ...saved, isLive: false, liveAlerts: [], isInitializing: false, activityLogs: saved.activityLogs || [] }));
          } else {
            console.log('No data found in IndexedDB');
            setState((prev) => ({ ...prev, isInitializing: false }));
          }
        })
        .catch((err) => {
          console.error('Error loading from IndexedDB:', err);
          setState((prev) => ({ ...prev, isInitializing: false }));
        });
    }

    loadData();
  }, []);

  // Realtime Sync
  useEffect(() => {
    if (state.isInitializing) return;

    const channel = supabase.channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'store_data',
          filter: 'id=eq.main-store',
        },
        (payload) => {
          console.log('🔄 Realtime update received from Supabase:', payload);
          if (payload.new && payload.new.data) {
            setState(prev => ({ ...prev, ...payload.new.data }));
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Supabase Realtime Status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [state.isInitializing]);

  const intervalRef = useRef(null);

  // Persist to IndexedDB and Supabase whenever data changes
  useEffect(() => {
    if (state.customers.length > 0 && !state.isInitializing) {
      const toSave = {
        customers: state.customers,
        stats: state.stats,
        columnMapping: state.columnMapping,
        fileName: state.fileName,
        uploadedAt: state.uploadedAt,
        uploads: state.uploads || [],
        activityLogs: state.activityLogs || [],
      };
      set(STORAGE_KEY, toSave).catch((e) => {
        console.warn('Failed to save to IndexedDB', e);
      });

      supabase.from('store_data').upsert({ id: 'main-store', data: toSave })
        .then(({ error }) => {
          if (error) console.warn('Supabase save error (is the table created?):', error.message);
        });

      // Background sync for individual customers to the relational table
      const customerRows = toSave.customers.map((c, i) => {
        // Ensure ID is unique across multiple uploads by appending timestamp if it's a duplicate or just making it unique
        const uniqueId = `${c.id}-${new Date(c.lastAnalyzed).getTime()}-${i}`;
        
        return {
          id: uniqueId,
          name: c.name || '',
          email: c.email || '',
          phone: c.phone || '',
          sector: c.sector || '',
          plan: c.plan || '',
          health_score: c.health?.score || 0,
          risk_level: c.riskLevel || 'low',
          revenue: isNaN(Number(c.revenue)) ? 0 : Number(c.revenue),
          last_analyzed: c.lastAnalyzed || new Date().toISOString(),
          raw_data: c
        };
      });

      if (customerRows.length > 0) {
        supabase.from('customers').upsert(customerRows)
          .then(({ error }) => {
            if (error) {
              console.error('Supabase customers sync error:', error);
            } else {
              console.log('Successfully synced customers to Supabase!');
            }
          });
      }
    }
  }, [state.customers, state.stats, state.isInitializing]);

  // Live monitoring
  useEffect(() => {
    if (state.isLive && state.customers.length > 0) {
      intervalRef.current = setInterval(() => {
        setState(prev => {
          const drifted = simulateLiveDrift(prev.customers);
          const newAlerts = drifted
            .filter(c => c._riskChanged && c.riskLevel === 'high')
            .map(c => ({
              id: `LIVE-${c.id}-${Date.now()}`,
              customerId: c.id,
              customerName: c.name,
              message: `انخفاض حاد في Health Score: ${c.previousScore} → ${c.health.score}`,
              severity: 'حرج',
              time: new Date().toLocaleTimeString('ar-EG'),
            }));

          return {
            ...prev,
            customers: drifted,
            stats: computeStats(drifted),
            liveAlerts: [...newAlerts, ...prev.liveAlerts],
          };
        });
      }, LIVE_INTERVAL_MS);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [state.isLive, state.customers.length]);

  // Use a ref so the auto-reanalysis effect always calls the latest version without stale closure issues
  const reanalyzeAllRef = useRef(null);

  // Auto daily re-analysis (Every 24 hours)
  useEffect(() => {
    if (state.isInitializing || state.customers.length === 0 || state.isAnalyzing) return;

    const checkAndReanalyze = () => {
      // 24 hours in milliseconds
      const TIME_LIMIT = 24 * 60 * 60 * 1000;

      // If lastAnalyzedAt is null, it means it's old data, so we use 0 to trigger it immediately.
      const lastRun = state.lastAnalyzedAt || state.uploadedAt || 0;

      const timePassed = Date.now() - lastRun;
      if (timePassed >= TIME_LIMIT) {
        console.log('🔄 24 ساعة مرت (أو بيانات قديمة)... جاري إعادة الAnalyze التلقائي بواسطة AI!');
        setTimeout(() => {
          if (reanalyzeAllRef.current) reanalyzeAllRef.current();
        }, 1000);
      }
    };

    checkAndReanalyze();
    // Check every hour (60 minutes)
    const interval = setInterval(checkAndReanalyze, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [state.isInitializing, state.lastAnalyzedAt, state.customers.length, state.isAnalyzing]);

  const actions = {
    // Re-analyze all existing customers with AI to refresh risk levels
    reanalyzeAll: async () => {
      if (state.customers.length === 0) return;
      setState(prev => ({ ...prev, isAnalyzing: true, analyzeProgress: 0 }));
      try {
        const smartBatch = async (batch) => {
          try {
            return await analyzeCustomerBatch(batch);
          } catch (e) {
            console.warn('Gemini failed, trying Groq:', e.message);
            if (isGroqAvailable()) return await groqAnalyzeCustomerBatch(batch);
            throw e;
          }
        };
        const customers = [...state.customers];
        const BATCH_SIZE = 20;
        const totalBatches = Math.ceil(customers.length / BATCH_SIZE);
        const updatedCustomers = [...customers];

        for (let i = 0; i < totalBatches; i++) {
          const start = i * BATCH_SIZE;
          const end = Math.min(start + BATCH_SIZE, customers.length);
          const batch = customers.slice(start, end);
          setState(prev => ({ ...prev, analyzeProgress: Math.round((i / totalBatches) * 100) }));

          try {
            const aiResults = await smartBatch(batch);
            aiResults.forEach(aiResult => {
              const idx = updatedCustomers.findIndex(c => c.id === aiResult.id);
              if (idx !== -1) {
                updatedCustomers[idx] = {
                  ...updatedCustomers[idx],
                  riskLevel: aiResult.riskLevel || updatedCustomers[idx].riskLevel,
                  churnProbability: aiResult.riskScore || updatedCustomers[idx].churnProbability,
                  aiInsights: aiResult.aiInsights || updatedCustomers[idx].aiInsights,
                  recommendations: aiResult.recommendations || updatedCustomers[idx].recommendations,
                };
              }
            });
          } catch (err) {
            console.error(`Batch ${i + 1} failed:`, err);
          }
        }

        setState(prev => ({
          ...prev,
          customers: updatedCustomers,
          stats: computeStats(updatedCustomers),
          isAnalyzing: false,
          analyzeProgress: 100,
          lastAnalyzedAt: Date.now(),
        }));
      } catch (err) {
        console.error('reanalyzeAll failed:', err);
        setState(prev => ({ ...prev, isAnalyzing: false }));
      }
    },
    // Expose a setter for the ref so it stays current
    _setReanalyzeRef: (fn) => { reanalyzeAllRef.current = fn; },

    // Upload and analyze new data (Append mode)
    loadData: async (rows, columnMapping, fileName) => {
      setState(prev => ({ ...prev, isAnalyzing: true, analyzeProgress: 0 }));
      const uploadId = Date.now();
      
      const newAnalyzed = await analyzeAll(rows, columnMapping, (progress) => {
        setState(prev => ({ ...prev, analyzeProgress: progress }));
      });
      
      setState(prev => {
        const mergedCustomers = [...prev.customers];
        
        newAnalyzed.forEach(newCust => {
          newCust.uploadId = uploadId;
          // Check if customer exists with the same Name AND Plan
          const existingIndex = mergedCustomers.findIndex(
            c => c.name === newCust.name && c.plan === newCust.plan
          );
          
          if (existingIndex >= 0) {
            // Update the existing customer (e.g. renewal dates, revenue) but keep their original ID
            mergedCustomers[existingIndex] = {
              ...newCust,
              id: mergedCustomers[existingIndex].id
            };
          } else {
            // Append as a new customer (new service or completely new customer)
            mergedCustomers.push(newCust);
          }
        });

        const newStats = computeStats(mergedCustomers);
        
        const newUploads = [...(prev.uploads || [])];
        newUploads.push({
          id: uploadId,
          fileName,
          uploadedAt: new Date().toISOString(),
          customerCount: newAnalyzed.length,
          avgHealth: newStats.avgHealth
        });
        
        return {
          ...prev,
          customers: mergedCustomers,
          stats: newStats,
          columnMapping, // Update column mapping to latest
          fileName: prev.fileName ? `${prev.fileName}, ${fileName}` : fileName,
          uploadedAt: new Date().toISOString(),
          uploads: newUploads,
          isAnalyzing: false,
          analyzeProgress: 100,
          liveAlerts: [], 
        };
      });
    },

    deleteUpload: (uploadId) => {
      setState(prev => {
        // Handle legacy fallback delete
        if (uploadId === 1 && (!prev.uploads || prev.uploads.length === 0)) {
          const remainingCustomers = prev.customers.filter(c => c.uploadId && c.uploadId !== 1);
          return {
            ...prev,
            fileName: null,
            uploadedAt: null,
            uploads: [],
            customers: remainingCustomers,
            stats: computeStats(remainingCustomers),
          };
        }

        const newUploads = (prev.uploads || []).filter(u => u.id !== uploadId);
        const newCustomers = prev.customers.filter(c => c.uploadId !== uploadId);
        
        return {
          ...prev,
          uploads: newUploads,
          customers: newCustomers,
          stats: computeStats(newCustomers),
        };
      });
    },

    // Toggle live monitoring
    setLive: (val) => setState(prev => ({ ...prev, isLive: val })),

    updateCustomer: (id, data) => {
      setState(prev => {
        const customer = prev.customers.find(c => c.id === id);
        let logDetails = '';
        if (data.status) logDetails = `تم Changed status to:: ${data.status}`;
        if (data.assignedTo !== undefined) logDetails = `تم Assigned employee: ${data.assignedTo || 'لا أحد'}`;
        
        const newLog = logDetails ? {
          id: Date.now(),
          time: new Date().toISOString(),
          action: 'Update Customer',
          details: `${logDetails} (Customer: ${customer?.name})`
        } : null;

        const merged = prev.customers.map(c => {
          if (c.id === id) {
            let updatedC = { ...c, ...data };
            // Track assignment history
            if (data.assignedTo !== undefined && data.assignedTo !== c.assignedTo && data.assignedTo.trim() !== '') {
              const history = c.assignmentHistory || [];
              updatedC.assignmentHistory = [...history, { employee: data.assignedTo, date: new Date().toISOString() }];
            }
            // Track per-customer action history
            const logs = c.customerLogs || [];
            if (data.status !== undefined && data.status !== c.status) {
               logs.push({ action: `Changed status to: ${data.status}`, employee: updatedC.assignedTo || 'غير محدد', date: new Date().toISOString() });
            }
            if (data.assignedTo !== undefined && data.assignedTo !== c.assignedTo) {
               logs.push({ action: `Assigned employee: ${data.assignedTo}`, employee: data.assignedTo, date: new Date().toISOString() });
            }
            updatedC.customerLogs = logs;
            return updatedC;
          }
          return c;
        });
        return { 
          ...prev, 
          customers: merged, 
          stats: computeStats(merged),
          activityLogs: newLog ? [newLog, ...(prev.activityLogs || [])] : prev.activityLogs
        };
      });
    },

    bulkUpdateCustomers: (ids, data) => {
      setState(prev => {
        let logDetails = '';
        if (data.status) logDetails = `Changed status to:: ${data.status}`;
        if (data.assignedTo !== undefined) logDetails = `Assigned employee: ${data.assignedTo || 'لا أحد'}`;

        const newLog = logDetails ? {
          id: Date.now(),
          time: new Date().toISOString(),
          action: 'تحديث جماعي',
          details: `تم إجراء تحديث جماعي (${logDetails}) لعدد ${ids.length} customer(s)`
        } : null;

        const merged = prev.customers.map(c => {
          if (ids.includes(c.id)) {
            let updatedC = { ...c, ...data };
            if (data.assignedTo !== undefined && data.assignedTo !== c.assignedTo && data.assignedTo.trim() !== '') {
              const history = c.assignmentHistory || [];
              updatedC.assignmentHistory = [...history, { employee: data.assignedTo, date: new Date().toISOString() }];
            }
            const logs = c.customerLogs || [];
            if (data.status !== undefined && data.status !== c.status) {
               logs.push({ action: `Bulk Update: Changed status to: ${data.status}`, employee: updatedC.assignedTo || 'غير محدد', date: new Date().toISOString() });
            }
            updatedC.customerLogs = logs;
            return updatedC;
          }
          return c;
        });
        return {
          ...prev,
          customers: merged,
          stats: computeStats(merged),
          activityLogs: newLog ? [newLog, ...(prev.activityLogs || [])] : prev.activityLogs
        };
      });
    },
    
    deleteCustomer: (id) => {
      setState(prev => {
        const merged = prev.customers.filter(c => c.id !== id);
        return { ...prev, customers: merged, stats: computeStats(merged) };
      });
    },
    
    addCustomer: (data) => {
      setState(prev => {
        const newCust = {
           id: `CUST-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`,
           name: data.customer_name || 'customer(s) New',
           sector: data.sector || 'غير محدد',
           plan: data.plan || 'غير محدد',
           revenue: Number(data.monthly_revenue) || 0,
           health: { score: 50, usage: 50, support: 50, payment: 50, revenue: 50 },
           riskLevel: 'medium',
           lastActivity: data.last_login || new Date().toISOString().split('T')[0],
           lastActivityDays: 0,
           phone: data.phone || '',
           initials: data.customer_name ? data.customer_name.slice(0, 2) : 'عج',
           color: '#3b82f6',
           status: 'New',
           paymentStatus: data.payment_status || 'غير محدد',
           contactPerson: data.contact_person || '',
           assignedTo: data.assigned_to || '',
           assignmentHistory: data.assigned_to ? [{ employee: data.assigned_to, date: new Date().toISOString() }] : [],
           renewalDate: data.renewal_date || null,
           rawMetrics: { 
             tickets: Number(data.support_tickets) || 0,
             logins: Number(data.login_count_30d) || 0,
             lastLogin: data.last_login || null,
             onboardingDate: data.onboarding_date || null,
             meetings30d: Number(data.meetings_30d) || 0,
             contactDays: Number(data.contact_days) || 0,
             contractType: data.contract_type || null,
             renewalSystem: data.renewal_system || null,
             roas: Number(data.roas) || 0,
             activeCampaigns: Number(data.active_campaigns) || 0,
             performanceTrend: data.performance_trend || null,
             lastCallRating: Number(data.last_call_rating) || 0,
             lastContactNotes: data.last_contact_notes || null
           }
        };
        const merged = [newCust, ...prev.customers];
        
        const newLog = {
          id: Date.now(),
          time: new Date().toISOString(),
          action: 'Add Customer',
          details: `تم Add New Customer: ${newCust.name}`
        };

        return { 
          ...prev, 
          customers: merged, 
          stats: computeStats(merged),
          activityLogs: [newLog, ...(prev.activityLogs || [])]
        };
      });
    },

    // Custom alerts functionality
    addCustomAlert: (alertData) => {
      setState(prev => {
        const newAlert = {
          id: `CUST-ALERT-${Date.now()}`,
          isCustom: true,
          status: 'New',
          time: new Date().toISOString(),
          ...alertData
        };
        const updated = { ...prev, customAlerts: [newAlert, ...(prev.customAlerts || [])] };
        set(STORAGE_KEY, updated).catch(() => {});
        return updated;
      });
    },

    deleteCustomAlert: (id) => {
      setState(prev => {
        const updated = { ...prev, customAlerts: (prev.customAlerts || []).filter(a => a.id !== id) };
        set(STORAGE_KEY, updated).catch(() => {});
        return updated;
      });
    },

    // Clear all data
    clearData: async () => {
      del(STORAGE_KEY);
      await supabase.from('store_data').delete().eq('id', 'main-store');
      setState({
        customers: [],
        stats: null,
        columnMapping: {},
        fileName: null,
        uploadedAt: null,
        uploads: [],
        isAnalyzing: false,
        isLive: false,
        liveAlerts: [],
        customAlerts: [],
        lastAnalyzedAt: null,
        isInitializing: false,
        activityLogs: [],
      });
    },

    // Dismiss a live alert
    dismissAlert: (id) => setState(prev => ({ ...prev, liveAlerts: prev.liveAlerts.filter(a => a.id !== id) })),
  };

  // Keep the ref always pointing to the latest reanalyzeAll
  reanalyzeAllRef.current = actions.reanalyzeAll;

  return (
    <DataContext.Provider value={{ ...state, ...actions }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  return useContext(DataContext);
}

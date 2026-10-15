/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  auth,
  db,
  googleProvider,
  testConnection,
  handleFirestoreError,
  OperationType,
} from './firebase';
import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  runTransaction,
  writeBatch,
} from 'firebase/firestore';
import {
  Client,
  Order,
  CompanySettings,
  AuthorizedUser,
  PaidService,
} from './types';
import {
  INITIAL_COMPANY_SETTINGS,
  INITIAL_AUTHORIZED_EMAILS,
  SUPER_ADMIN_EMAIL,
} from './utils/constants';

import { Navbar, ActiveTab } from './components/Navbar';
import { AuthView } from './components/AuthView';
import { ClientManagement } from './components/ClientManagement';
import { OrderList } from './components/OrderList';
import { OrderForm } from './components/OrderForm';
import { DocumentViewer } from './components/DocumentViewer';
import { CompanySettingsView } from './components/CompanySettingsView';
import { DeliveryCalendarView } from './components/DeliveryCalendarView';
import { DeliveryDashboardView } from './components/DeliveryDashboardView';
import { PaidServicesView } from './components/PaidServicesView';
import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <MainAppContent />
    </ErrorBoundary>
  );
}

function MainAppContent() {
  // Auth state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [unauthorizedEmail, setUnauthorizedEmail] = useState<string | null>(null);
  const [authErrorMessage, setAuthErrorMessage] = useState<string | null>(null);

  // App Navigation
  const [activeTab, setActiveTab] = useState<ActiveTab>('orders');

  // Firestore Data State
  const [companySettings, setCompanySettings] = useState<CompanySettings>(INITIAL_COMPANY_SETTINGS);
  const [clients, setClients] = useState<Client[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [authorizedUsers, setAuthorizedUsers] = useState<AuthorizedUser[]>([]);
  const [paidServices, setPaidServices] = useState<PaidService[]>([]);

  // Navigation targets
  const [orderToEdit, setOrderToEdit] = useState<Order | null>(null);
  const [activeOrderForDocument, setActiveOrderForDocument] = useState<Order | null>(null);
  const [targetClientForNewOrder, setTargetClientForNewOrder] = useState<Client | null>(null);

  // Initialize Auth Listener & Redirect Result
  useEffect(() => {
    // Check for redirect result on app load
    getRedirectResult(auth)
      .then(result => {
        if (result?.user) {
          console.log('Login via redirecionamento concluído para:', result.user.email);
        }
      })
      .catch(err => {
        console.error('Erro no resultado do redirecionamento:', err);
        setAuthErrorMessage(err?.message || 'Falha ao autenticar por redirecionamento.');
      });

    const unsubscribe = onAuthStateChanged(auth, async user => {
      setIsAuthLoading(true);
      if (user && user.email) {
        setCurrentUser(user);
        const email = user.email.toLowerCase().trim();
        const isSuperAdmin = email === SUPER_ADMIN_EMAIL.toLowerCase().trim();

        // Check if email is Super Admin or in INITIAL_AUTHORIZED_EMAILS whitelist
        const isPreAuthorized = INITIAL_AUTHORIZED_EMAILS.some(
          e => e.toLowerCase().trim() === email
        );

        if (isSuperAdmin) {
          setIsAuthorized(true);
          setUnauthorizedEmail(null);
          // Bootstrap Super Admin in Firestore authorized_users
          try {
            await setDoc(
              doc(db, 'authorized_users', email),
              {
                email,
                name: user.displayName || 'Super Admin (Dono)',
                role: 'super_admin',
                addedAt: new Date().toISOString(),
                addedBy: 'master',
              },
              { merge: true }
            );

            // Also ensure pre-authorized initial team members exist in Firestore
            for (const preEmail of INITIAL_AUTHORIZED_EMAILS) {
              const cleanPreEmail = preEmail.toLowerCase().trim();
              if (cleanPreEmail !== email) {
                await setDoc(
                  doc(db, 'authorized_users', cleanPreEmail),
                  {
                    email: cleanPreEmail,
                    name: 'Silvano Filho (Funcionário)',
                    role: 'operador',
                    addedAt: new Date().toISOString(),
                    addedBy: SUPER_ADMIN_EMAIL,
                  },
                  { merge: true }
                );
              }
            }
          } catch (err) {
            console.error('Error bootstrapping users:', err);
          }
        } else if (isPreAuthorized) {
          // User is registered in INITIAL_AUTHORIZED_EMAILS
          setIsAuthorized(true);
          setUnauthorizedEmail(null);
          try {
            await setDoc(
              doc(db, 'authorized_users', email),
              {
                email,
                name: user.displayName || 'Silvano Filho',
                role: 'operador',
                addedAt: new Date().toISOString(),
                addedBy: SUPER_ADMIN_EMAIL,
              },
              { merge: true }
            );
          } catch (err) {
            console.error('Error writing authorized user record:', err);
          }
        } else {
          // Check Firestore collection authorized_users
          try {
            const userDoc = await getDoc(doc(db, 'authorized_users', email));
            if (userDoc.exists()) {
              setIsAuthorized(true);
              setUnauthorizedEmail(null);
            } else {
              setIsAuthorized(false);
              setUnauthorizedEmail(user.email);
            }
          } catch (err) {
            console.error('Authorization check error:', err);
            setIsAuthorized(false);
            setUnauthorizedEmail(user.email);
          }
        }
      } else {
        setCurrentUser(null);
        setIsAuthorized(false);
        setUnauthorizedEmail(null);
      }
      setIsAuthLoading(false);
    });

    testConnection();
    return () => unsubscribe();
  }, []);

  // 1. Company Settings & Logo Listener (Always active so branding & official logo appear on login screen)
  useEffect(() => {
    // Check local cache first for instant logo and settings display without wait
    try {
      const cached = localStorage.getItem('almaprint_company_settings');
      if (cached) {
        const parsed = JSON.parse(cached) as CompanySettings;
        if (parsed?.logoUrl) {
          setCompanySettings(prev => ({ ...prev, ...parsed }));
        }
      }
    } catch {}

    const settingsRef = doc(db, 'company_settings', 'main');
    const unsubSettings = onSnapshot(
      settingsRef,
      snapshot => {
        if (snapshot.exists()) {
          const data = snapshot.data() as CompanySettings;
          setCompanySettings(data);
          try {
            localStorage.setItem('almaprint_company_settings', JSON.stringify(data));
          } catch {}

          const isOldPaulino = (data.address || '').toLowerCase().includes('josé paulino');
          const isOldCnpj = (data.cnpj || '').replace(/\D/g, '') === '52917006000121';
          if (isOldPaulino || isOldCnpj) {
            const updatedData: CompanySettings = {
              ...data,
              address: isOldPaulino ? 'Rua Regente Feijó, 484 - Centro' : data.address,
              cnpj: isOldCnpj ? '65.349.937/0001-12' : data.cnpj,
              zipCode: isOldPaulino ? '13013-051' : data.zipCode,
              city: isOldPaulino ? 'Campinas' : data.city,
              state: isOldPaulino ? 'SP' : data.state,
              unit: isOldPaulino ? 'Campinas - SP' : data.unit,
            };
            setCompanySettings(updatedData);
            const isSuperAdminUser = (currentUser?.email || '').toLowerCase().trim() === SUPER_ADMIN_EMAIL.toLowerCase().trim();
            if (isSuperAdminUser) {
              setDoc(settingsRef, updatedData, { merge: true }).catch(console.warn);
            }
          }
        } else {
          // Initialize default company settings in Firestore (Super admin only)
          const isSuperAdminUser = (currentUser?.email || '').toLowerCase().trim() === SUPER_ADMIN_EMAIL.toLowerCase().trim();
          if (isSuperAdminUser) {
            setDoc(settingsRef, INITIAL_COMPANY_SETTINGS).catch(err => {
              console.warn('Could not auto-init settings:', err);
            });
          }
        }
      },
      error => {
        console.warn('Non-fatal: could not sync public company settings:', error);
      }
    );

    return () => unsubSettings();
  }, [currentUser]);

  // Listen for Firestore authenticated collections once authorized
  useEffect(() => {
    if (!currentUser || !isAuthorized) return;

    // 2. Clients Listener
    const clientsRef = collection(db, 'clients');
    const unsubClients = onSnapshot(
      clientsRef,
      snapshot => {
        const list: Client[] = [];
        snapshot.forEach(docSnap => {
          list.push({ id: docSnap.id, ...(docSnap.data() as Omit<Client, 'id'>) });
        });
        list.sort((a, b) => a.name.localeCompare(b.name));
        setClients(list);
      },
      error => {
        handleFirestoreError(error, OperationType.LIST, 'clients');
      }
    );

    // 3. Orders Listener
    const ordersRef = collection(db, 'orders');
    const unsubOrders = onSnapshot(
      ordersRef,
      snapshot => {
        const list: Order[] = [];
        snapshot.forEach(docSnap => {
          list.push({ id: docSnap.id, ...(docSnap.data() as Omit<Order, 'id'>) });
        });
        list.sort((a, b) => (b.orderNumberInt || 0) - (a.orderNumberInt || 0));
        setOrders(list);

        setActiveOrderForDocument(prev => {
          if (!prev) return null;
          const updated = list.find(o => o.id === prev.id);
          return updated || prev;
        });
      },
      error => {
        handleFirestoreError(error, OperationType.LIST, 'orders');
      }
    );

    // 4. Authorized Users Listener
    const authUsersRef = collection(db, 'authorized_users');
    const unsubAuthUsers = onSnapshot(
      authUsersRef,
      snapshot => {
        const list: AuthorizedUser[] = [];
        snapshot.forEach(docSnap => {
          list.push(docSnap.data() as AuthorizedUser);
        });
        setAuthorizedUsers(list);
      },
      error => {
        handleFirestoreError(error, OperationType.LIST, 'authorized_users');
      }
    );

    // 5. Paid Services Listener
    const paidServicesRef = collection(db, 'paid_services');
    const unsubPaidServices = onSnapshot(
      paidServicesRef,
      snapshot => {
        const list: PaidService[] = [];
        snapshot.forEach(docSnap => {
          list.push({ id: docSnap.id, ...(docSnap.data() as Omit<PaidService, 'id'>) });
        });
        list.sort((a, b) => {
          const dateA = a.date || '';
          const dateB = b.date || '';
          if (dateA !== dateB) return dateB.localeCompare(dateA);
          return (b.time || '').localeCompare(a.time || '');
        });
        setPaidServices(list);
      },
      error => {
        handleFirestoreError(error, OperationType.LIST, 'paid_services');
      }
    );

    return () => {
      unsubClients();
      unsubOrders();
      unsubAuthUsers();
      unsubPaidServices();
    };
  }, [currentUser, isAuthorized]);

  // Auto-sync company settings to previous orders if any have outdated company address/CNPJ (Super Admin only)
  useEffect(() => {
    const isSuperAdminUser = (currentUser?.email || '').toLowerCase().trim() === SUPER_ADMIN_EMAIL.toLowerCase().trim();
    if (!isSuperAdminUser || orders.length === 0 || !companySettings?.address) return;

    const hasOutdated = orders.some(o => {
      const snap = o.companySnapshot;
      if (!snap) return true;
      const snapCnpj = (snap.cnpj || '').replace(/\D/g, '');
      const targetCnpj = (companySettings.cnpj || '').replace(/\D/g, '');
      const snapAddr = (snap.address || '').toLowerCase().trim();
      const targetAddr = (companySettings.address || '').toLowerCase().trim();
      return snapCnpj !== targetCnpj || snapAddr !== targetAddr;
    });

    if (hasOutdated) {
      syncCompanySettingsToAllOrders(companySettings, orders);
    }
  }, [orders, companySettings, currentUser]);

  // Auth Actions
  const handleGoogleLogin = async () => {
    try {
      setIsAuthLoading(true);
      setAuthErrorMessage(null);
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error('Login error:', err);
      const code = err?.code || '';
      if (code === 'auth/popup-closed-by-user') {
        setAuthErrorMessage(
          'A janela de login do Google foi fechada antes de selecionar sua conta. Se a janela fechar sozinha no seu celular, use a opção "Entrar por Redirecionamento" abaixo.'
        );
      } else if (code === 'auth/popup-blocked') {
        setAuthErrorMessage(
          'O navegador bloqueou a abertura da janela de login. Por favor, utilize a opção "Entrar por Redirecionamento" abaixo ou clique em "Abrir aplicativo em nova aba".'
        );
      } else if (code === 'auth/unauthorized-domain') {
        setAuthErrorMessage(
          `Domínio atual (${window.location.hostname}) precisa estar autorizado no console do Firebase.`
        );
      } else {
        setAuthErrorMessage(err?.message || 'Falha na autenticação com o Google.');
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleGoogleLoginRedirect = async () => {
    try {
      setIsAuthLoading(true);
      setAuthErrorMessage(null);
      await signInWithRedirect(auth, googleProvider);
    } catch (err: any) {
      console.error('Login redirect error:', err);
      setAuthErrorMessage(err?.message || 'Falha ao redirecionar para o login do Google.');
      setIsAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      setIsAuthorized(false);
      setUnauthorizedEmail(null);
      setAuthErrorMessage(null);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Client Save Action
  const handleSaveClient = async (clientData: Partial<Client>): Promise<Client> => {
    const isNew = !clientData.id;
    const clientId = clientData.id || doc(collection(db, 'clients')).id;
    const now = new Date().toISOString();

    const clientPayload: Client = {
      id: clientId,
      name: clientData.name || '',
      cpfCnpj: clientData.cpfCnpj || '',
      contactPerson: clientData.contactPerson || '',
      phone: clientData.phone || '',
      email: clientData.email || '',
      address: clientData.address || '',
      zipCode: clientData.zipCode || '',
      city: clientData.city || '',
      state: clientData.state || '',
      notes: clientData.notes || '',
      createdAt: clientData.createdAt || now,
      updatedAt: now,
      createdBy: clientData.createdBy || currentUser?.email || 'user',
      updatedBy: currentUser?.email || 'user',
    };

    try {
      await setDoc(doc(db, 'clients', clientId), clientPayload, { merge: true });
      return clientPayload;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `clients/${clientId}`);
      throw err;
    }
  };

  // Client Delete Action
  const handleDeleteClient = async (clientId: string) => {
    try {
      await deleteDoc(doc(db, 'clients', clientId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `clients/${clientId}`);
    }
  };

  // Order Save Action (with atomic number increment & concurrency detection)
  const handleSaveOrder = async (orderData: Partial<Order>) => {
    const isEditing = Boolean(orderData.id);
    const now = new Date().toISOString();

    try {
      if (isEditing && orderData.id) {
        // Concurrency detection: verify version
        const orderRef = doc(db, 'orders', orderData.id);
        const currentDoc = await getDoc(orderRef);
        if (currentDoc.exists()) {
          const currentData = currentDoc.data() as Order;
          if (
            orderToEdit &&
            currentData.version &&
            orderToEdit.version &&
            currentData.version > orderToEdit.version
          ) {
            const proceed = confirm(
              `Atenção: Este pedido foi alterado por "${currentData.updatedBy || 'outro usuário'}" enquanto você editava.\n\nDeseja sobrescrever as alterações mais recentes com as suas?`
            );
            if (!proceed) return;
          }
        }

        const updatedOrder: Partial<Order> = {
          ...orderData,
          updatedAt: now,
          updatedBy: currentUser?.email || 'user',
          version: (orderToEdit?.version || 1) + 1,
        };

        await updateDoc(orderRef, updatedOrder);
        const fullOrder = { ...(orderToEdit || {}), ...updatedOrder } as Order;
        setActiveOrderForDocument(fullOrder);
        setActiveTab('document_view');
      } else {
        // New Order: Atomic Sequential Number Generation via runTransaction
        const orderId = doc(collection(db, 'orders')).id;
        const settingsRef = doc(db, 'company_settings', 'main');

        let assignedOrderNumber = orderData.orderNumber || '';
        let assignedOrderNumberInt = orderData.orderNumberInt || 8579;

        try {
          await runTransaction(db, async transaction => {
            const settingsSnap = await transaction.get(settingsRef);
            let currentSeq = 8579;
            if (settingsSnap.exists()) {
              const data = settingsSnap.data() as CompanySettings;
              currentSeq = data.nextOrderNumber || 8579;
            }

            if (!orderData.orderNumber || orderData.orderNumber === String(companySettings.nextOrderNumber)) {
              assignedOrderNumber = String(currentSeq);
              assignedOrderNumberInt = currentSeq;
              transaction.update(settingsRef, {
                nextOrderNumber: currentSeq + 1,
              });
            }

            const newOrder: Order = {
              id: orderId,
              orderNumber: assignedOrderNumber,
              orderNumberInt: assignedOrderNumberInt,
              date: orderData.date || new Date().toLocaleDateString('pt-BR'),
              status: orderData.status || 'orcamento',
              clientId: orderData.clientId,
              clientSnapshot: orderData.clientSnapshot!,
              companySnapshot: orderData.companySnapshot || companySettings,
              items: orderData.items || [],
              totalGeneralCents: orderData.totalGeneralCents || 0,
              paymentTerms: orderData.paymentTerms || '',
              pixKey: orderData.pixKey || companySettings.pixKey,
              deliveryTime: orderData.deliveryTime || '',
              notes: orderData.notes || '',
              version: 1,
              createdBy: currentUser?.email || 'user',
              updatedBy: currentUser?.email || 'user',
              createdAt: now,
              updatedAt: now,
            };

            const newOrderRef = doc(db, 'orders', orderId);
            transaction.set(newOrderRef, newOrder);
          });
        } catch (txErr) {
          console.warn('Transaction on nextOrderNumber failed, saving order directly:', txErr);
          const fallbackOrder: Order = {
            id: orderId,
            orderNumber: assignedOrderNumber || String(companySettings.nextOrderNumber || 8579),
            orderNumberInt: assignedOrderNumberInt || companySettings.nextOrderNumber || 8579,
            date: orderData.date || new Date().toLocaleDateString('pt-BR'),
            status: orderData.status || 'orcamento',
            clientId: orderData.clientId,
            clientSnapshot: orderData.clientSnapshot!,
            companySnapshot: orderData.companySnapshot || companySettings,
            items: orderData.items || [],
            totalGeneralCents: orderData.totalGeneralCents || 0,
            paymentTerms: orderData.paymentTerms || '',
            pixKey: orderData.pixKey || companySettings.pixKey,
            deliveryTime: orderData.deliveryTime || '',
            notes: orderData.notes || '',
            version: 1,
            createdBy: currentUser?.email || 'user',
            updatedBy: currentUser?.email || 'user',
            createdAt: now,
            updatedAt: now,
          };
          await setDoc(doc(db, 'orders', orderId), fallbackOrder);
        }

        const createdOrder: Order = {
          id: orderId,
          orderNumber: assignedOrderNumber,
          orderNumberInt: assignedOrderNumberInt,
          date: orderData.date || new Date().toLocaleDateString('pt-BR'),
          status: orderData.status || 'orcamento',
          clientId: orderData.clientId,
          clientSnapshot: orderData.clientSnapshot!,
          companySnapshot: orderData.companySnapshot || companySettings,
          items: orderData.items || [],
          totalGeneralCents: orderData.totalGeneralCents || 0,
          paymentTerms: orderData.paymentTerms || '',
          pixKey: orderData.pixKey || companySettings.pixKey,
          deliveryTime: orderData.deliveryTime || '',
          notes: orderData.notes || '',
          version: 1,
          createdBy: currentUser?.email || 'user',
          updatedBy: currentUser?.email || 'user',
          createdAt: now,
          updatedAt: now,
        };

        setActiveOrderForDocument(createdOrder);
        setActiveTab('document_view');
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'orders');
      throw err;
    }
  };

  // Duplicate Order Action
  const handleDuplicateOrder = (order: Order) => {
    const clonedOrder: Order = {
      ...order,
      id: '',
      orderNumber: String(companySettings.nextOrderNumber || 8579),
      orderNumberInt: companySettings.nextOrderNumber || 8579,
      status: 'orcamento',
      date: new Date().toLocaleDateString('pt-BR'),
      version: 1,
      createdAt: '',
      updatedAt: '',
    };
    setOrderToEdit(clonedOrder);
    setTargetClientForNewOrder(null);
    setActiveTab('order_form');
  };

  // Cancel Order Action
  const handleCancelOrder = async (order: Order) => {
    try {
      await updateDoc(doc(db, 'orders', order.id), {
        status: 'cancelado',
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser?.email || 'user',
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `orders/${order.id}`);
      throw err;
    }
  };

  // Delete Order Action (Permanent Removal)
  const handleDeleteOrder = async (orderId: string) => {
    try {
      await deleteDoc(doc(db, 'orders', orderId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `orders/${orderId}`);
      throw err;
    }
  };

  // Sync Company Settings across all existing orders in Firestore
  const syncCompanySettingsToAllOrders = async (targetSettings: CompanySettings, orderList: Order[]): Promise<number> => {
    if (!orderList || orderList.length === 0 || !targetSettings?.address) return 0;

    const outdatedOrders = orderList.filter(o => {
      const snap = o.companySnapshot;
      if (!snap) return true;
      const snapCnpj = (snap.cnpj || '').replace(/\D/g, '');
      const targetCnpj = (targetSettings.cnpj || '').replace(/\D/g, '');
      const snapAddr = (snap.address || '').toLowerCase().trim();
      const targetAddr = (targetSettings.address || '').toLowerCase().trim();
      const snapZip = (snap.zipCode || '').replace(/\D/g, '');
      const targetZip = (targetSettings.zipCode || '').replace(/\D/g, '');

      return (
        snapCnpj !== targetCnpj ||
        snapAddr !== targetAddr ||
        snapZip !== targetZip
      );
    });

    if (outdatedOrders.length === 0) return 0;

    try {
      for (let i = 0; i < outdatedOrders.length; i += 400) {
        const chunk = outdatedOrders.slice(i, i + 400);
        const batch = writeBatch(db);
        chunk.forEach(ord => {
          const ref = doc(db, 'orders', ord.id);
          batch.update(ref, {
            companySnapshot: targetSettings,
            updatedAt: new Date().toISOString(),
          });
        });
        await batch.commit();
      }
      return outdatedOrders.length;
    } catch (err) {
      console.warn('Erro ao sincronizar pedidos anteriores:', err);
      return 0;
    }
  };

  // Company Settings Save (Restricted to Super Admin)
  const handleSaveCompanySettings = async (newSettings: CompanySettings) => {
    const isSuperAdmin = currentUser?.email?.toLowerCase().trim() === SUPER_ADMIN_EMAIL.toLowerCase().trim();
    if (!isSuperAdmin) {
      alert(`Permissão negada. Apenas o Super Admin (${SUPER_ADMIN_EMAIL}) pode alterar as configurações da empresa.`);
      return;
    }
    try {
      await setDoc(doc(db, 'company_settings', 'main'), newSettings, { merge: true });
      setCompanySettings(newSettings);
      await syncCompanySettingsToAllOrders(newSettings, orders);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'company_settings/main');
      throw err;
    }
  };

  // Authorized Users Actions
  const handleAddAuthorizedUser = async (email: string) => {
    const cleanEmail = email.toLowerCase().trim();
    const isSuperAdmin = currentUser?.email?.toLowerCase().trim() === SUPER_ADMIN_EMAIL.toLowerCase().trim();
    if (!isSuperAdmin) {
      alert(`Permissão negada. Apenas o Super Admin (${SUPER_ADMIN_EMAIL}) pode autorizar novos usuários.`);
      return;
    }

    try {
      await setDoc(doc(db, 'authorized_users', cleanEmail), {
        email: cleanEmail,
        role: 'operador',
        addedAt: new Date().toISOString(),
        addedBy: currentUser?.email || SUPER_ADMIN_EMAIL,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `authorized_users/${cleanEmail}`);
      throw err;
    }
  };

  const handleRemoveAuthorizedUser = async (email: string) => {
    const cleanEmail = email.toLowerCase().trim();
    if (cleanEmail === SUPER_ADMIN_EMAIL.toLowerCase().trim()) {
      alert('O Super Admin principal não pode ser removido.');
      return;
    }

    const isSuperAdmin = currentUser?.email?.toLowerCase().trim() === SUPER_ADMIN_EMAIL.toLowerCase().trim();
    if (!isSuperAdmin) {
      alert(`Permissão negada. Apenas o Super Admin (${SUPER_ADMIN_EMAIL}) pode remover usuários.`);
      return;
    }

    try {
      await deleteDoc(doc(db, 'authorized_users', cleanEmail));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `authorized_users/${cleanEmail}`);
      throw err;
    }
  };

  // Restore Backup Action (Restricted to Super Admin)
  const handleRestoreBackup = async (backupData: {
    settings?: CompanySettings;
    clients?: Client[];
    orders?: Order[];
    authorizedUsers?: AuthorizedUser[];
  }) => {
    const isSuperAdmin = currentUser?.email?.toLowerCase().trim() === SUPER_ADMIN_EMAIL.toLowerCase().trim();
    if (!isSuperAdmin) {
      alert(`Permissão negada. Apenas o Super Admin (${SUPER_ADMIN_EMAIL}) pode restaurar backups.`);
      return;
    }

    const batch = writeBatch(db);

    if (backupData.settings) {
      batch.set(doc(db, 'company_settings', 'main'), backupData.settings, { merge: true });
    }

    if (backupData.clients && backupData.clients.length > 0) {
      backupData.clients.forEach(c => {
        batch.set(doc(db, 'clients', c.id), c, { merge: true });
      });
    }

    if (backupData.orders && backupData.orders.length > 0) {
      backupData.orders.forEach(o => {
        batch.set(doc(db, 'orders', o.id), o, { merge: true });
      });
    }

    if (backupData.authorizedUsers && backupData.authorizedUsers.length > 0) {
      backupData.authorizedUsers.forEach(u => {
        batch.set(doc(db, 'authorized_users', u.email.toLowerCase()), u, { merge: true });
      });
    }

    try {
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'batch_restore');
      throw err;
    }
  };

  // Paid Services Actions
  const handleSavePaidService = async (serviceData: Partial<PaidService>) => {
    const now = new Date().toISOString();
    try {
      if (serviceData.id) {
        const serviceRef = doc(db, 'paid_services', serviceData.id);
        const updatePayload: Partial<PaidService> = {
          ...serviceData,
          updatedAt: now,
          updatedBy: currentUser?.email || 'user',
        };
        await updateDoc(serviceRef, updatePayload);
      } else {
        const id = doc(collection(db, 'paid_services')).id;
        const newRecord: PaidService = {
          id,
          date: serviceData.date || new Date().toISOString().split('T')[0],
          time: serviceData.time || '12:00',
          service: serviceData.service || '',
          valueCents: serviceData.valueCents || 0,
          providerName: serviceData.providerName || '',
          paymentMethod: serviceData.paymentMethod || 'PIX',
          notes: serviceData.notes || '',
          category: serviceData.category || '',
          createdAt: now,
          updatedAt: now,
          createdBy: currentUser?.email || 'user',
          updatedBy: currentUser?.email || 'user',
        };
        await setDoc(doc(db, 'paid_services', id), newRecord);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `paid_services/${serviceData.id || 'new'}`);
      throw err;
    }
  };

  const handleDeletePaidService = async (serviceId: string) => {
    try {
      await deleteDoc(doc(db, 'paid_services', serviceId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `paid_services/${serviceId}`);
      throw err;
    }
  };

  // If user is not authenticated or not authorized, show AuthView
  if (!currentUser || !isAuthorized) {
    return (
      <AuthView
        onLogin={handleGoogleLogin}
        onLoginRedirect={handleGoogleLoginRedirect}
        onLogout={handleLogout}
        isLoading={isAuthLoading}
        unauthorizedEmail={unauthorizedEmail}
        authErrorMessage={authErrorMessage}
        customLogoUrl={companySettings.logoUrl}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#04140d] text-white flex flex-col font-sans relative selection:bg-emerald-500/40 selection:text-white w-full max-w-full overflow-x-hidden">
      {/* Decorative ambient glass light glows */}
      <div className="no-print fixed inset-0 pointer-events-none overflow-hidden z-0 max-w-full">
        <div className="absolute -top-40 left-1/4 w-[400px] sm:w-[600px] h-[400px] sm:h-[600px] bg-emerald-500/10 rounded-full blur-[100px] sm:blur-[140px]" />
        <div className="absolute top-1/2 -right-40 w-[350px] sm:w-[500px] h-[350px] sm:h-[500px] bg-teal-500/8 rounded-full blur-[100px] sm:blur-[140px]" />
        <div className="absolute -bottom-40 left-10 w-[350px] sm:w-[500px] h-[350px] sm:h-[500px] bg-emerald-600/8 rounded-full blur-[100px] sm:blur-[140px]" />
      </div>

      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        clientsCount={clients.length}
        ordersCount={orders.length}
        pendingDeliveriesCount={orders.filter(o => o.status !== 'concluido' && o.status !== 'cancelado').length}
        paidServicesCount={paidServices.length}
        userEmail={currentUser.email || ''}
        onLogout={handleLogout}
        customLogoUrl={companySettings.logoUrl}
        onNewOrder={() => {
          setOrderToEdit(null);
          setTargetClientForNewOrder(null);
          setActiveTab('order_form');
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8 relative z-10 min-w-0 overflow-x-hidden">
        {/* 1. Clientes Tab */}
        {activeTab === 'clients' && (
          <ClientManagement
            clients={clients}
            orders={orders}
            currentUserEmail={currentUser.email || ''}
            onSaveClient={handleSaveClient}
            onDeleteClient={handleDeleteClient}
            onViewOrder={order => {
              setActiveOrderForDocument(order);
              setActiveTab('document_view');
            }}
            onCreateOrderForClient={client => {
              setOrderToEdit(null);
              setTargetClientForNewOrder(client);
              setActiveTab('order_form');
            }}
          />
        )}

        {/* 2. Pedidos & Orçamentos List Tab */}
        {activeTab === 'orders' && (
          <OrderList
            orders={orders}
            companySettings={companySettings}
            onCreateNew={() => {
              setOrderToEdit(null);
              setTargetClientForNewOrder(null);
              setActiveTab('order_form');
            }}
            onViewOrder={order => {
              setActiveOrderForDocument(order);
              setActiveTab('document_view');
            }}
            onEditOrder={order => {
              setOrderToEdit(order);
              setTargetClientForNewOrder(null);
              setActiveTab('order_form');
            }}
            onDuplicateOrder={handleDuplicateOrder}
            onCancelOrder={handleCancelOrder}
            onDeleteOrder={handleDeleteOrder}
          />
        )}

        {/* 3. Order Form Tab (New or Edit) */}
        {activeTab === 'order_form' && (
          <OrderForm
            orderToEdit={orderToEdit}
            defaultClient={targetClientForNewOrder}
            clients={clients}
            companySettings={companySettings}
            currentUserEmail={currentUser.email || ''}
            onSave={handleSaveOrder}
            onCancel={() => {
              setOrderToEdit(null);
              setActiveTab('orders');
            }}
            onQuickCreateClient={handleSaveClient}
          />
        )}

        {/* 4. Document Viewer Tab (Visual Budget, Order & OS) */}
        {activeTab === 'document_view' && activeOrderForDocument && (
          <DocumentViewer
            order={activeOrderForDocument}
            companySettings={companySettings}
            onBack={() => setActiveTab('orders')}
            onEdit={order => {
              setOrderToEdit(order);
              setActiveTab('order_form');
            }}
          />
        )}

        {/* 5. Configurações da Empresa Tab */}
        {activeTab === 'settings' && (
          <CompanySettingsView
            settings={companySettings}
            authorizedUsers={authorizedUsers}
            currentUserEmail={currentUser.email || ''}
            clients={clients}
            orders={orders}
            onSaveSettings={handleSaveCompanySettings}
            onAddAuthorizedUser={handleAddAuthorizedUser}
            onRemoveAuthorizedUser={handleRemoveAuthorizedUser}
            onRestoreBackup={handleRestoreBackup}
            onSyncOrdersCompanySettings={() => syncCompanySettingsToAllOrders(companySettings, orders)}
          />
        )}

        {/* 6. Calendário de Entregas Tab (NOVO) */}
        {activeTab === 'calendar' && (
          <DeliveryCalendarView
            orders={orders}
            onViewOrder={order => {
              setActiveOrderForDocument(order);
              setActiveTab('document_view');
            }}
            onEditOrder={order => {
              setOrderToEdit(order);
              setTargetClientForNewOrder(null);
              setActiveTab('order_form');
            }}
            onCreateNewOrder={() => {
              setOrderToEdit(null);
              setTargetClientForNewOrder(null);
              setActiveTab('order_form');
            }}
          />
        )}

        {/* 7. Prestação de Serviços Pagos Tab (NOVO) */}
        {activeTab === 'paid_services' && (
          <PaidServicesView
            paidServices={paidServices}
            companySettings={companySettings}
            currentUserEmail={currentUser.email || ''}
            onSavePaidService={handleSavePaidService}
            onDeletePaidService={handleDeletePaidService}
          />
        )}

        {/* 8. Dashboard de Entregas & Pedidos com Contagem de Gastos */}
        {activeTab === 'dashboard' && (
          <DeliveryDashboardView
            orders={orders}
            paidServices={paidServices}
            onViewOrder={order => {
              setActiveOrderForDocument(order);
              setActiveTab('document_view');
            }}
            onGoToDeliveries={() => setActiveTab('calendar')}
            onGoToOrders={() => setActiveTab('orders')}
            onGoToPaidServices={() => setActiveTab('paid_services')}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="no-print py-4 sm:py-5 bg-[#052116]/80 backdrop-blur-md border-t border-emerald-500/15 text-xs text-emerald-300/80 relative z-10">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-3 text-center md:text-left">
          <span className="text-emerald-200/90 font-medium">ALMA PRINT &bull; Gráfica e Embalagens &bull; CNPJ 52.917.006/0001-21</span>
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-[11px]">
            <span className="text-emerald-200/90">
              Desenvolvido por <strong className="text-emerald-100 font-semibold">Ferrer Design</strong> -{' '}
              <a
                href="mailto:ferrerdesignoficial@proton.me"
                className="underline hover:text-white transition-colors font-mono"
              >
                ferrerdesignoficial@proton.me
              </a>
            </span>
            <span className="font-mono text-emerald-400/80 hidden sm:inline">&bull; v1.0.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

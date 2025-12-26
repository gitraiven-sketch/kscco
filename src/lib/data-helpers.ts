// This file is now marked for client-side execution,
// but can be used on the server as well.
'use client'; 
// Using 'use client' is a temporary workaround. Ideally, this would be refactored
// to have distinct server and client data functions.

import type { Tenant, Property, Payment, TenantWithDetails, PaymentStatus } from './types';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';

function getPaymentStatus(tenant: Tenant, allPayments: Payment[]): { status: PaymentStatus, dueDate: Date } {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    const dueDate = new Date(currentYear, currentMonth, tenant.paymentDay);
    
    const paymentForCurrentMonth = allPayments.find(p => 
        p.tenantId === tenant.id &&
        new Date(p.date).getMonth() === currentMonth &&
        new Date(p.date).getFullYear() === currentYear
    );

    if (paymentForCurrentMonth) {
        return { status: 'Paid', dueDate };
    }

    if (today > dueDate) {
        return { status: 'Overdue', dueDate };
    }

    return { status: 'Upcoming', dueDate };
}

async function getProperties(): Promise<Property[]> {
    try {
        const { firestore } = initializeFirebase();
        const propertyCollection = collection(firestore, 'properties');
        const propertySnapshot = await getDocs(propertyCollection);
        return propertySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Property));
    } catch (error) {
        console.error("Error fetching properties:", error);
        throw error; // Re-throw to be caught by callers
    }
}


export async function getTenantsWithDetails(): Promise<TenantWithDetails[]> {
    try {
        const { firestore } = initializeFirebase();
        const tenantsCollection = collection(firestore, 'tenants');
        const properties = await getProperties();
        
        const tenantSnapshot = await getDocs(tenantsCollection);
        const tenantList = tenantSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tenant));
        
        const propertyMap = new Map<string, Property>(properties.map(p => [p.id, p]));

        const tenantsWithDetails: TenantWithDetails[] = [];

        for (const tenant of tenantList) {
            const paymentCollection = collection(firestore, 'tenants', tenant.id, 'payments');
            const paymentSnapshot = await getDocs(paymentCollection);
            const tenantPayments = paymentSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));
            
            const { status, dueDate } = getPaymentStatus(tenant, tenantPayments);

            tenantsWithDetails.push({
                ...tenant,
                property: propertyMap.get(tenant.propertyId)!,
                paymentStatus: status,
                dueDate,
                payments: tenantPayments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
            });
        }
        
        return tenantsWithDetails;

    } catch (error) {
        console.error("Error fetching tenants with details:", error);
        throw error; // Re-throw to be caught by callers
    }
}

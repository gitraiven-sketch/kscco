
// This file is now marked for client-side execution,
// but can be used on the server as well.
'use client'; 
// Using 'use client' is a temporary workaround. Ideally, this would be refactored
// to have distinct server and client data functions.

import type { Tenant, Property, TenantWithDetails, PaymentStatus } from './types';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';

function getPaymentStatus(tenant: Tenant): { status: PaymentStatus, dueDate: Date } {
    const today = new Date();
    const lastPaid = tenant.lastPaidDate ? new Date(tenant.lastPaidDate) : new Date(tenant.leaseStartDate);
    
    let dueDate = new Date(lastPaid.getFullYear(), lastPaid.getMonth(), tenant.paymentDay);
    // The next due date is the month after the last payment was made.
    dueDate.setMonth(dueDate.getMonth() + 1);

    if (today > dueDate) {
        return { status: 'Overdue', dueDate };
    }
    
    const lastPaidYear = lastPaid.getFullYear();
    const lastPaidMonth = lastPaid.getMonth();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    if (lastPaidYear === currentYear && lastPaidMonth === currentMonth) {
        return { status: 'Paid', dueDate };
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

        const tenantsWithDetails: TenantWithDetails[] = tenantList.map(tenant => {
            const { status, dueDate } = getPaymentStatus(tenant);
            return {
                ...tenant,
                property: propertyMap.get(tenant.propertyId)!,
                paymentStatus: status,
                dueDate,
            };
        });
        
        return tenantsWithDetails;

    } catch (error) {
        console.error("Error fetching tenants with details:", error);
        throw error; // Re-throw to be caught by callers
    }
}

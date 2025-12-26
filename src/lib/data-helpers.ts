
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
    today.setHours(0, 0, 0, 0); // Normalize today to the start of the day

    const lastPaid = tenant.lastPaidDate ? new Date(tenant.lastPaidDate) : new Date(tenant.leaseStartDate);
    
    const leaseStart = new Date(tenant.leaseStartDate);

    // Determine the most recent payment cycle start date before or on today
    let currentCycleStart = new Date(today.getFullYear(), today.getMonth(), tenant.paymentDay);
    if (today.getDate() < tenant.paymentDay) {
        // We are in the previous month's payment cycle
        currentCycleStart.setMonth(currentCycleStart.getMonth() - 1);
    }
    
    // Ensure the cycle start is not before the lease start
    if (currentCycleStart < leaseStart) {
        currentCycleStart = new Date(leaseStart.getFullYear(), leaseStart.getMonth(), tenant.paymentDay);
        if(leaseStart.getDate() > tenant.paymentDay) {
            currentCycleStart.setMonth(currentCycleStart.getMonth() + 1)
        }
    }
    
    const nextDueDate = new Date(currentCycleStart.getFullYear(), currentCycleStart.getMonth(), tenant.paymentDay);
    if(today >= nextDueDate) {
         nextDueDate.setMonth(nextDueDate.getMonth() + 1);
    }


    if (lastPaid >= currentCycleStart) {
        return { status: 'Paid', dueDate: nextDueDate };
    }

    if (today >= new Date(currentCycleStart.getFullYear(), currentCycleStart.getMonth(), tenant.paymentDay)) {
         const overdueDueDate = new Date(currentCycleStart.getFullYear(), currentCycleStart.getMonth(), tenant.paymentDay);
         return { status: 'Overdue', dueDate: overdueDueDate };
    }
    
    return { status: 'Upcoming', dueDate: nextDueDate };
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
            const property = propertyMap.get(tenant.propertyId);
            if (!property) {
                // This can happen if a property is deleted but the tenant still references it.
                // We'll create a placeholder property to avoid crashing.
                return {
                    ...tenant,
                    property: { id: tenant.propertyId, name: 'Unknown Property', group: 'Unknown', shopNumber: 0, address: '', paymentDay: tenant.paymentDay },
                    paymentStatus: 'Upcoming',
                    dueDate: new Date(),
                };
            }
            const { status, dueDate } = getPaymentStatus(tenant);
            return {
                ...tenant,
                property: property,
                paymentStatus: status,
                dueDate,
            };
        }).filter(t => t.property.name !== 'Unknown Property'); // Filter out tenants with missing properties for safety
        
        return tenantsWithDetails;

    } catch (error) {
        console.error("Error fetching tenants with details:", error);
        throw error; // Re-throw to be caught by callers
    }
}

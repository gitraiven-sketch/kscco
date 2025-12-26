'use client';

import { useEffect, useState } from 'react';
import { useAuth, useFirestore } from '@/firebase';
import { collection, onSnapshot, getDocs, doc } from 'firebase/firestore';
import type { Tenant, Property, PaymentStatus } from '@/lib/types';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Users,
  Building,
  Home,
  CheckCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from '@/components/ui/chart';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { getTenantsWithDetails } from '@/lib/data-helpers';

type DashboardData = {
  totalTenants: number;
  totalProperties: number;
  vacantProperties: number;
  statusCounts: {
    paid: number;
    overdue: number;
    upcoming: number;
  };
};

const chartConfig: ChartConfig = {
  paid: {
    label: 'Paid',
    color: 'hsl(var(--chart-1))',
    icon: CheckCircle,
  },
  overdue: {
    label: 'Overdue',
    color: 'hsl(var(--destructive))',
    icon: AlertCircle,
  },
  upcoming: {
    label: 'Upcoming',
    color: 'hsl(var(--chart-2))',
    icon: Clock,
  },
};

export function DashboardClient() {
  const firestore = useFirestore();
  const auth = useAuth();
  const [data, setData] = useState<DashboardData>({
    totalTenants: 0,
    totalProperties: 0,
    vacantProperties: 0,
    statusCounts: { paid: 0, overdue: 0, upcoming: 0 },
  });

  useEffect(() => {
    if (!firestore || !auth) return;

    const tenantsRef = collection(firestore, 'tenants');
    const propertiesRef = collection(firestore, 'properties');

    const unsubTenants = onSnapshot(tenantsRef, async (tenantSnapshot) => {
        const propSnapshot = await getDocs(propertiesRef).catch(error => {
            const permissionError = new FirestorePermissionError({ path: propertiesRef.path, operation: 'list'}, auth);
            errorEmitter.emit('permission-error', permissionError);
            return null;
        });

        if (!propSnapshot) return;

        const tenantsWithDetails = await getTenantsWithDetails().catch(error => {
            // This will catch errors from getProperties or getTenantsWithDetails
            // which might be permission errors.
             if (error.message.includes('permission')) {
                // A bit of a guess, but better than nothing.
                const permissionError = new FirestorePermissionError({ path: 'tenants or properties', operation: 'list' }, auth);
                errorEmitter.emit('permission-error', permissionError);
             }
             return [];
        });

        const statusCounts = tenantsWithDetails.reduce((acc, tenant) => {
            acc[tenant.paymentStatus] = (acc[tenant.paymentStatus] || 0) + 1;
            return acc;
        }, {} as Record<PaymentStatus, number>);


        const occupiedPropertyIds = new Set(tenantSnapshot.docs.map(doc => (doc.data() as Tenant).propertyId));
        const vacantCount = propSnapshot.docs.filter(doc => !occupiedPropertyIds.has(doc.id)).length;
        
        setData({
            totalTenants: tenantSnapshot.size,
            totalProperties: propSnapshot.size,
            vacantProperties: vacantCount,
            statusCounts: {
                paid: statusCounts.Paid || 0,
                overdue: statusCounts.Overdue || 0,
                upcoming: statusCounts.Upcoming || 0,
            }
        });

    }, (error) => {
        const permissionError = new FirestorePermissionError({ path: tenantsRef.path, operation: 'list' }, auth);
        errorEmitter.emit('permission-error', permissionError);
    });

    const unsubProperties = onSnapshot(propertiesRef, async (propSnapshot) => {
        const tenantSnapshot = await getDocs(tenantsRef).catch(error => {
            const permissionError = new FirestorePermissionError({ path: tenantsRef.path, operation: 'list' }, auth);
            errorEmitter.emit('permission-error', permissionError);
            return null;
        });
        if (!tenantSnapshot) return;

        const occupiedPropertyIds = new Set(tenantSnapshot.docs.map(doc => (doc.data() as Tenant).propertyId));
        const vacantCount = propSnapshot.docs.filter(doc => !occupiedPropertyIds.has(doc.id)).length;
        
        setData(prevData => ({
            ...prevData, 
            totalProperties: propSnapshot.size,
            vacantProperties: vacantCount,
        }));
    }, (error) => {
        const permissionError = new FirestorePermissionError({ path: propertiesRef.path, operation: 'list' }, auth);
        errorEmitter.emit('permission-error', permissionError);
    });


    return () => {
        unsubTenants();
        unsubProperties();
    };
  }, [firestore, auth]);


  const chartData = [
    { name: 'paid', value: data.statusCounts.paid, fill: 'var(--color-paid)' },
    { name: 'overdue', value: data.statusCounts.overdue, fill: 'var(--color-overdue)' },
    { name: 'upcoming', value: data.statusCounts.upcoming, fill: 'var(--color-upcoming)' },
  ].filter(item => item.value > 0);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Properties</CardTitle>
          <Building className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.totalProperties}</div>
          <p className="text-xs text-muted-foreground">Managed properties</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.totalTenants}</div>
          <p className="text-xs text-muted-foreground">Currently active tenants</p>
        </CardContent>
      </Card>
       <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Vacant Shops</CardTitle>
          <Home className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.vacantProperties}</div>
          <p className="text-xs text-muted-foreground">Properties without tenants</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Payment Status
          </CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="flex items-center justify-center pt-4">
          {chartData.length > 0 ? (
            <ChartContainer
              config={chartConfig}
              className="mx-auto aspect-square h-[120px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel />}
                  />
                  <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={35} outerRadius={50} strokeWidth={2}>
                      {chartData.map((entry) => (
                          <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                      ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No payment data available.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

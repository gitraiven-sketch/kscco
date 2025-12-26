'use client';

import { getTenantsWithDetails } from '@/lib/data-helpers';
import { RentReminder } from '@/components/reminders/rent-reminder';
import { useEffect, useState } from 'react';
import type { TenantWithDetails } from '@/lib/types';
import { Loader2 } from 'lucide-react';

export default function RemindersPage() {
  const [tenants, setTenants] = useState<TenantWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getTenantsWithDetails()
      .then(setTenants)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);


  return (
    <div className="space-y-6">
       <div>
        <h1 className="text-3xl font-bold tracking-tight">Rent Reminders</h1>
        <p className="text-muted-foreground">
          Generate and send payment reminders to tenants.
        </p>
      </div>
      {isLoading ? (
         <div className="flex h-64 w-full items-center justify-center rounded-lg border">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
         </div>
      ) : (
        <RentReminder tenants={tenants} />
      )}
    </div>
  );
}

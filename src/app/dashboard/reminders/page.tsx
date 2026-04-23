import { getTenantsWithDetails } from '@/lib/data-helpers';
import { RentReminder } from '@/components/reminders/rent-reminder';
import { differenceInDays } from 'date-fns';
import type { TenantWithDetails } from '@/lib/types';

export const dynamic = 'force-dynamic';

type CategorizedTenants = {
  dueIn3Days: TenantWithDetails[];
  dueIn2Days: TenantWithDetails[];
  dueIn1Day: TenantWithDetails[];
  dueToday: TenantWithDetails[];
  overdue: TenantWithDetails[];
}

export default async function RemindersPage() {
  const tenants = await getTenantsWithDetails();
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const categorizedTenants: CategorizedTenants = {
    dueIn3Days: [],
    dueIn2Days: [],
    dueIn1Day: [],
    dueToday: [],
    overdue: [],
  };
  
  tenants.forEach(tenant => {
    if (tenant.paymentStatus === 'Paid') return;

    const dueDate = new Date(tenant.dueDate);
    dueDate.setHours(0, 0, 0, 0);

    const diff = differenceInDays(dueDate, today);
    
    if (diff < 0) {
      categorizedTenants.overdue.push(tenant);
    } else if (diff === 0) {
      categorizedTenants.dueToday.push(tenant);
    } else if (diff === 1) {
      categorizedTenants.dueIn1Day.push(tenant);
    } else if (diff === 2) {
      categorizedTenants.dueIn2Days.push(tenant);
    } else if (diff === 3) {
      categorizedTenants.dueIn3Days.push(tenant);
    }
  });

  return (
    <div className="space-y-6">
       <div>
        <h1 className="text-3xl font-bold tracking-tight">Rent Reminders</h1>
        <p className="text-muted-foreground">
          Generate and send payment reminders to tenants.
        </p>
      </div>
      <RentReminder categorizedTenants={categorizedTenants} />
    </div>
  );
}

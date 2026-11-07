import { createDatabase } from '../src/client.js';
import {
  availabilityCalendars,
  availabilityRules,
  bookingPolicies,
  customers,
  permissions,
  resources,
  rolePermissions,
  roles,
  serviceResources,
  services,
  tenantMemberships,
  tenants,
  users,
} from '../src/schema/index.js';
import { databaseUrl } from './environment.js';

if (process.env.NODE_ENV !== 'development') {
  throw new Error('Development seed requires NODE_ENV=development');
}

const seedId = (n: number) =>
  `00000000-0000-4000-8000-${n.toString(16).padStart(12, '0')}`;
const connection = createDatabase(databaseUrl());
try {
  await connection.db.transaction(async (tx) => {
    await tx
      .insert(users)
      .values({
        id: seedId(1),
        email: 'developer@agendoxa.example',
        fullName: 'Development operator',
      })
      .onConflictDoNothing();
    const capabilities = [
      'catalog.read',
      'bookings.manage',
      'availability.manage',
    ];
    await tx
      .insert(permissions)
      .values(
        capabilities.map((key, index) => ({
          id: seedId(10 + index),
          key,
          description: `Development capability: ${key}`,
          isDelegable: true,
        })),
      )
      .onConflictDoNothing();

    const businesses = [
      {
        slug: 'demo-barber',
        name: 'Barbería demo',
        service: 'Corte',
        resource: 'Profesional demo',
        kind: 'PROFESSIONAL' as const,
        duration: 30,
        price: '7500.00',
      },
      {
        slug: 'demo-club',
        name: 'Club demo',
        service: 'Alquiler 60 minutos',
        resource: 'Cancha 1',
        kind: 'PHYSICAL' as const,
        duration: 60,
        price: '30000.00',
      },
    ];

    for (const [index, business] of businesses.entries()) {
      const base = 100 + index * 100;
      const tenantId = seedId(base);
      const adminId = seedId(base + 1);
      const staffId = seedId(base + 2);
      const serviceId = seedId(base + 3);
      const resourceId = seedId(base + 4);
      const calendarId = seedId(base + 5);
      await tx
        .insert(tenants)
        .values({
          id: tenantId,
          name: business.name,
          slug: business.slug,
          timezone: 'America/Argentina/Buenos_Aires',
          currency: 'ARS',
        })
        .onConflictDoNothing();
      await tx
        .insert(roles)
        .values([
          {
            id: adminId,
            tenantId,
            name: 'Admin',
            systemKey: 'ADMIN',
            isProtected: true,
          },
          {
            id: staffId,
            tenantId,
            name: 'Staff',
            systemKey: 'STAFF',
            isProtected: false,
          },
        ])
        .onConflictDoNothing();
      await tx
        .insert(tenantMemberships)
        .values({
          id: seedId(base + 6),
          tenantId,
          userId: seedId(1),
          roleId: adminId,
        })
        .onConflictDoNothing();
      await tx
        .insert(rolePermissions)
        .values(
          capabilities.flatMap((_, permission) => [
            {
              tenantId,
              roleId: adminId,
              permissionId: seedId(10 + permission),
            },
            {
              tenantId,
              roleId: staffId,
              permissionId: seedId(10 + permission),
            },
          ]),
        )
        .onConflictDoNothing();
      await tx
        .insert(customers)
        .values({
          id: seedId(base + 7),
          tenantId,
          fullName: 'Cliente de ejemplo',
          phone: '+5491100000000',
        })
        .onConflictDoNothing();
      await tx
        .insert(services)
        .values({
          id: serviceId,
          tenantId,
          name: business.service,
          duration: business.duration,
          price: business.price,
        })
        .onConflictDoNothing();
      await tx
        .insert(resources)
        .values({
          id: resourceId,
          tenantId,
          name: business.resource,
          kind: business.kind,
        })
        .onConflictDoNothing();
      await tx
        .insert(serviceResources)
        .values({ tenantId, serviceId, resourceId })
        .onConflictDoNothing();
      await tx
        .insert(availabilityCalendars)
        .values({
          id: calendarId,
          tenantId,
          scope: 'TENANT',
        })
        .onConflictDoNothing();
      await tx
        .insert(availabilityRules)
        .values(
          [1, 2, 3, 4, 5].map((weekday) => ({
            id: seedId(base + 10 + weekday),
            tenantId,
            calendarId,
            weekday,
            startTime: '09:00',
            endTime: '20:00',
          })),
        )
        .onConflictDoNothing();
      await tx
        .insert(bookingPolicies)
        .values({
          id: seedId(base + 20),
          tenantId,
          scope: 'TENANT',
          notice: 600,
          bookingLead: 0,
          depositMode: 'DISABLED',
        })
        .onConflictDoNothing();
    }
  });
  console.log(
    'Development seed applied: demo-barber and demo-club. No login credentials created.',
  );
} finally {
  await connection.close();
}

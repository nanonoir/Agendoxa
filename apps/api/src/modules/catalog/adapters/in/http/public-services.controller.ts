import {
  Controller,
  Get,
  Header,
  Inject,
  NotFoundException,
  Param,
} from '@nestjs/common';
import {
  publicServiceListSchema,
  slugSchema,
  type PublicServiceList,
} from '@agendoxa/shared';
import { parseRequest } from '../../../../../platform/http/request-validation.js';
import {
  PUBLIC_TENANT_LOOKUP,
  type PublicTenantLookup,
} from '../../../../tenants/contracts/public-tenant-lookup.js';
import { ListActiveServices } from '../../../application/use-cases/list-active-services.js';

/**
 * `listPublicServices` (CON-02 §7.2): read-only landing data, no session.
 * This inbound adapter validates the request with the shared contract,
 * resolves the tenant once from the slug, calls the use case and maps its
 * result to the HTTP view. It holds no business rules.
 */
@Controller('public/businesses/:slug/services')
export class PublicServicesController {
  constructor(
    @Inject(PUBLIC_TENANT_LOOKUP)
    private readonly tenants: PublicTenantLookup,
    @Inject(ListActiveServices)
    private readonly listActiveServices: ListActiveServices,
  ) {}

  @Get()
  @Header('Cache-Control', 'public, max-age=300')
  async list(@Param('slug') rawSlug: string): Promise<PublicServiceList> {
    const slug = parseRequest(slugSchema, rawSlug, '/slug');
    // The slug selects which business to display; it authorizes nothing.
    const tenant = await this.tenants.findBySlug(slug);
    if (!tenant) throw new NotFoundException();

    const services = await this.listActiveServices.execute({
      tenantId: tenant.tenantId,
    });
    return publicServiceListSchema.parse({
      items: services.map((service) => ({
        id: service.id,
        name: service.name,
        description: service.description,
        durationMinutes: service.durationMinutes,
        price: service.price,
      })),
    });
  }
}

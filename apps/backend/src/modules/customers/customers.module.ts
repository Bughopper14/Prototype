import {Module} from '@nestjs/common';
import {CompanyRecordMapper} from '../applications/repositories/company-record';
import {MasterIdLookup} from '../applications/repositories/master-ids';
import {BusinessPartnersRepository} from './business-partners.repository';
import {CustomersController} from './customers.controller';

/** The customer directory (crm_master_business_partners). */
@Module({
  controllers: [CustomersController],
  providers: [BusinessPartnersRepository, MasterIdLookup, CompanyRecordMapper],
  exports: [BusinessPartnersRepository, MasterIdLookup, CompanyRecordMapper],
})
export class CustomersModule {}

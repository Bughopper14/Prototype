import {Module} from '@nestjs/common';
import {ApplicationsModule} from '../applications/applications.module';
import {MasterDataController} from './master-data.controller';
import {MasterDataService} from './master-data.service';
import {BusinessMastersRepository} from './repositories/business-masters.repository';
import {CustomerMastersRepository} from './repositories/customer-masters.repository';
import {DocumentMastersRepository} from './repositories/document-masters.repository';
import {EquipmentMastersRepository} from './repositories/equipment-masters.repository';
import {FinanceMastersRepository} from './repositories/finance-masters.repository';
import {LegalMastersRepository} from './repositories/legal-masters.repository';
import {LocationRepository} from './repositories/location.repository';
import {MandatoryRulesRepository} from './repositories/mandatory-rules.repository';
import {MasterTableRepository} from './repositories/master-table';
import {PreanalysisMastersRepository} from './repositories/preanalysis-masters.repository';
import {WorkflowMastersRepository} from './repositories/workflow-masters.repository';

/** Master data on the crm_ master tables. CrmDatabase comes from the global CrmDatabaseModule. */
@Module({
  imports: [ApplicationsModule],
  controllers: [MasterDataController],
  providers: [
    MasterDataService,
    MasterTableRepository,
    CustomerMastersRepository,
    BusinessMastersRepository,
    LegalMastersRepository,
    FinanceMastersRepository,
    EquipmentMastersRepository,
    LocationRepository,
    DocumentMastersRepository,
    MandatoryRulesRepository,
    WorkflowMastersRepository,
    PreanalysisMastersRepository,
  ],
  exports: [MasterDataService],
})
export class MasterDataModule {}

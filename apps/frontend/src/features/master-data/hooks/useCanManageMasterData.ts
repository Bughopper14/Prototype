/** True when the user's role may add, edit or delete master data (the screen itself only needs the view authority). */
import {useCrm} from '@/features/crm/components/CrmProvider';
import {hasAuthority} from '@/shared/lib/auth';

export const useCanManageMasterData = () => hasAuthority(useCrm().user, 'crm_manage_master_data');

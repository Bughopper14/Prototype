/** Global stylesheet of the CRM workspace matching LiugongApps_Clean/CRM_Dashboard/src/styles.css. */
import crmUnifiedCss from '../styles/styles.css?raw';

export function CrmStyles() {
  return <style data-crm dangerouslySetInnerHTML={{__html: crmUnifiedCss}} />;
}


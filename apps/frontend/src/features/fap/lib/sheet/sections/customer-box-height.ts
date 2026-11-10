/** Stretches the customer data box to just above the e-mail row. */

export function fitCustomerBox({doc}: {doc: Document}) {
  // Sync customer data box height to reach just above Email
  try {
    const box = doc.getElementById('fap-customer-data-box');
    const comp = doc.getElementById('fap-preview-sec-company');
    const emailTd = doc.getElementById('fap-email-label');
    if (box && comp && emailTd) {
      const emailTr = emailTd.closest('tr');
      if (emailTr) {
        const h = emailTr.offsetTop - comp.offsetTop - 4;
        if (h > 1000) {
          box.style.height = `${h}px`;
        }
      }
    }
  } catch (_) {}
}

/** Script inside the sheet: keeps the customer data box aligned with the e-mail row. */
export const FAP_SCRIPT = `<script>
function syncCustomerBox() {
  try {
    var box = document.getElementById('fap-customer-data-box');
    var comp = document.getElementById('fap-preview-sec-company');
    var emailTd = document.getElementById('fap-email-label');
    if (box && comp && emailTd) {
      var emailTr = emailTd.closest('tr');
      if (emailTr) {
        var h = (emailTr.offsetTop - comp.offsetTop) - 4;
        if (h > 1000) {
          box.style.height = h + 'px';
        }
      }
    }
  } catch (e) {}
}
window.addEventListener('DOMContentLoaded', syncCustomerBox);
window.addEventListener('load', syncCustomerBox);
window.addEventListener('resize', syncCustomerBox);
window.onbeforeprint = syncCustomerBox;
syncCustomerBox();
</script>
</body>
</html>
`;
